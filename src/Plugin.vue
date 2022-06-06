<template>
  <span>Plugin</span>
</template>

<script>
import StreamDeck from '@/modules/common/streamdeck'
export default {
  name: 'Plugin',
  data: () => {
    return {
      buttons: {},
      $SD: null,
      globalSettings: {},
      buttonLongPressTimeouts: new Map()
    }
  },
  beforeCreate () {
    window.connectElgatoStreamDeckSocket = (inPort, inPluginUUID, inRegisterEvent, inInfo) => {
      this.$SD = new StreamDeck(inPort, inPluginUUID, inRegisterEvent, inInfo, '{}')

      this.$SD.on('connected', () => {
        console.debug('connected')
        this.$SD.requestGlobalSettings()
      })

      this.$SD.on('willAppear', (message) => {
        console.debug('willAppear')
        this.$SD.requestSettings(message.context)
        this.buttons[message.context] = {}
        this.$SD.setTitle(message.context, 'CodePipeline')

        // Reset image to default
        const canvas = this.getCanvas(message.context)
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, 88, 88)
        this.toggleBackgroundImage(message.context)
      })

      this.$SD.on('willDisappear', (message) => {
        console.debug('willDisappear')
        // Remove Timer to prevent background update image
        if (this.buttons[message.context].timer) {
          delete this.buttons[message.context].timer
        }
      })

      this.$SD.on('globalsettings', (globalSettings) => {
        console.debug('globalsettings', globalSettings)
        this.globalSettings = globalSettings
      })

      this.$SD.on('didReceiveSettings', (message) => {
        console.debug('didReceiveSettings', message)
        this.buttons[message.context] = message.payload.settings
      })

      this.$SD.on('keyDown', (message) => {
        const context = message.context
        const timeout = setTimeout(buttonLongPress, 200, context)
        this.buttonLongPressTimeouts.set(context, timeout)
      })

      this.$SD.on('keyUp', (message) => {
        const context = message.context

        // If 'long press timeout' is still present, we perform a normal press
        const lpTimeout = this.buttonLongPressTimeouts.get(context)
        if (lpTimeout) {
          clearTimeout(lpTimeout)
          this.buttonLongPressTimeouts.delete(context)
          buttonShortPress(context)
        }
      })

      this.$SD.on('titleParametersDidChange', (message) => {
        console.log('titleParametersDidChange', message)
      })

      const buttonShortPress = (context) => {
        console.log('buttonShortPress')
        this.onButtonShortPress(context)
      }

      const buttonLongPress = (context) => {
        console.log('buttonLongPress')
        this.buttonLongPressTimeouts.delete(context)
        this.toggleBackgroundImage(context)
      }
    }
  },
  methods: {
    setAWSConfig: function () {
      window.AWS.config.update(this.globalSettings.awsConfig)
    },
    onButtonShortPress: function (context) {
      this.getPipelineState(context)
    },
    getPipelineState: async function (context) {
      this.setAWSConfig()
      const codePipeline = new window.AWS.CodePipeline()
      codePipeline.getPipelineState({ name: this.buttons[context].pipelineConfig.name }, (err, data) => {
        if (err) {
          alert(err)
        }
        console.log('codePipelineState response', data)
        this.setResult(context, data)
      })
    },
    setResult: async function (context, data) {
      console.log('setResult', data)

      const canvas = this.getCanvas(context)
      const ctx = canvas.getContext('2d')
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      this.buttons[context].timer = ms => new Promise(resolve => setTimeout(resolve, ms))
      for (const stage of data.stageStates) {
        // Only update image when appear
        if (this.buttons[context].timer) {
          const stageName = stage.stageName
          const status = stage.latestExecution.status
          ctx.clearRect(0, 0, 88, 88)
          ctx.font = '12px sans-serif'
          ctx.fillStyle = '#fd9207'
          ctx.fillText(stageName, 44, 44)
          ctx.fillStyle = '#a7e90b'
          ctx.fillText(status, 44, 60)
          this.$SD.setImage(context, canvas.toDataURL())
          await this.buttons[context].timer(600)
        }
      }
      // Reset to default image
      ctx.clearRect(0, 0, 88, 88)
      this.toggleBackgroundImage(context)
    },
    scalePreserveAspectRatio: function (imgW, imgH, maxW, maxH) {
      return (Math.min((maxW / imgW), (maxH / imgH)))
    },
    getCanvas: function (context) {
      let target = document.querySelector(`canvas#button-${context}`)
      if (!target) {
        const canvas = document.createElement('canvas')
        canvas.id = 'button-' + context
        canvas.width = 88
        canvas.height = 88
        document.body.appendChild(canvas)
        target = canvas
      }
      return target
    },
    toggleBackgroundImage: function (context) {
      this.buttons[context].status = !this.buttons[context].status
      const canvas = this.getCanvas(context)
      const ctx = canvas.getContext('2d')

      const background = new Image()
      const iconOn = './icons/keyIcon-on.png'
      // const iconOff = './icons/keyIcon-off.png'
      // background.src = this.buttons[context].status ? iconOff : iconOn
      background.src = iconOn

      background.onload = () => {
        const w = 72
        const h = 72
        const sizer = this.scalePreserveAspectRatio(w, h, canvas.width, canvas.height)
        ctx.drawImage(background, 0, 0, w, h, 0, 0, w * sizer, h * sizer)
        // console.log(ctx, canvas.toDataURL())
        // canvas.setAttribute(['data-image-src'], canvas.toDataURL())
        this.$SD.setImage(context, canvas.toDataURL())
      }
    }
  }
}
</script>
