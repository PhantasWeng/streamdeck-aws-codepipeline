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
      })

      this.$SD.on('willDisappear', (message) => {
        console.debug('willDisappear')
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
        this.setBackgroundImage(context)
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
    getPipelineState: function (context) {
      this.setAWSConfig()
      const codePipeline = new window.AWS.CodePipeline()
      codePipeline.getPipelineState({ name: this.buttons[context].pipelineConfig.name }, (err, data) => {
        if (err) {
          alert(err)
        }
        console.log('codePipelineState data', data)
      })
    },
    scalePreserveAspectRatio: function (imgW, imgH, maxW, maxH) {
      return (Math.min((maxW / imgW), (maxH / imgH)))
    },
    setBackgroundImage: function (context) {
      this.buttons[context].status = !this.buttons[context].status
      const canvas = document.createElement('canvas')
      canvas.id = context
      document.body.appendChild(canvas)

      const ctx = canvas.getContext('2d')

      canvas.width = 88
      canvas.height = 88
      const background = new Image()
      const iconOn = './icons/keyIcon-on.png'
      const iconOff = './icons/keyIcon-off.png'
      background.src = this.buttons[context].status ? iconOff : iconOn

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
