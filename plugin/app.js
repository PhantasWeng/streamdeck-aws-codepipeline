// defaults write com.elgato.StreamDeck html_remote_debugging_enabled -bool YES
// Debug: http://localhost:23654/

const pluginUuid = 'tw.phantas.aws-codepipeline-status'
const pressTimer = {
  counter: {},
  clock: {}
}

$SD.on('connected', (jsonObj) => connected(jsonObj))

function connected(jsn) {
  // Subscribe to the willAppear and other events
  $SD.on(`${pluginUuid}.action.willAppear`, (jsonObj) => action.onWillAppear(jsonObj))

  $SD.on(`${pluginUuid}.action.keyDown`, (jsonObj) => action.onKeyDown(jsonObj))
  $SD.on(`${pluginUuid}.action.keyUp`, (jsonObj) => action.onKeyUp(jsonObj))

  $SD.on(`${pluginUuid}.action.sendToPlugin`, (jsonObj) => action.onSendToPlugin(jsonObj))
  $SD.on(`${pluginUuid}.action.didReceiveSettings`, (jsonObj) => action.onDidReceiveSettings(jsonObj))

  $SD.on(`${pluginUuid}.action.propertyInspectorDidAppear`, (jsonObj) => {
    console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]propertyInspectorDidAppear:')
  })
  $SD.on(`${pluginUuid}.action.propertyInspectorDidDisappear`, (jsonObj) => {
    console.log('%c%s', 'color: white; background: red; font-size: 13px;', '[app.js]propertyInspectorDidDisappear:')
  })
}

// ACTIONS
const action = {
  settings: {},
  onDidReceiveSettings: function (jsn) {
    console.log('%c%s', 'color: white; background: red; font-size: 15px;', '[app.js]onDidReceiveSettings:')

    this.settings = Utils.getProp(jsn, 'payload.settings', {})
    this.logger(this.settings, 'onDidReceiveSettings', 'orange')
  },
  init: function (jsn) {
    this.settings = jsn.payload.settings

    // Nothing in the settings pre-fill, just something for demonstration purposes
    if (!this.settings || Object.keys(this.settings).length === 0) {
      this.settings.title = 'Get Status'
    } else {
      this.settings.title = this.settings.pipelineName || 'Get Status'
    }
    this.setTitle(jsn)
    Utils.loadImage('./assets/default.png', img => {
      $SD.connection.sendJSON({
        "event": "setImage",
        "context": jsn.context,
        "payload": {
          "image": img,
          "target": 0,
        }
      })
    })
  },
  openWebPage: function (jsn) {
    this.settings = jsn.payload.settings
    const url = `https://${this.settings.regionId}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${this.settings.pipelineId}/view?region=${this.settings.regionId}`
    $SD.api.openUrl(jsn.context, url)
  },
  onWillAppear: function (jsn) {
    console.log("onWillAppear", jsn.payload.settings)
    $SD.api.getGlobalSettings(jsn.context)
    action.init(jsn)
  },
  onKeyDown: function (jsn) {
    pressTimer.counter[jsn.context] = 0
    pressTimer.clock[jsn.context] = setInterval(() => {
      pressTimer.counter[jsn.context]++
      if (pressTimer.counter[jsn.context] > 0) {
        clearInterval(pressTimer.clock[jsn.context])
        action.init(jsn)
        action.openWebPage(jsn)
      }
    }, 150)
  },
  onKeyUp: async function (jsn) {
    this.logger(jsn, 'onKeyUp', 'red')
    clearInterval(pressTimer.clock[jsn.context])
    if (pressTimer.counter[jsn.context] && pressTimer.counter[jsn.context] > 0) {
      // Long Press
    } else {
      const awsCredentials = {
        accessKeyId: jsn.payload.settings.accessKeyId,
        secretAccessKey: jsn.payload.settings.secretAccessKey,
        region: jsn.payload.settings.regionId,
      }
      AWS.config.update(awsCredentials)
      const aws = new AWS.CodePipeline()
      console.log('$SD.api', $SD.api)
      console.log('$SD', $SD)
      console.log('Utils', Utils)
      console.log('pipelineId', jsn.payload.settings.pipelineId)

      this.settings = jsn.payload.settings
      Utils.loadImage('./assets/loading.png', img => {
        $SD.connection.sendJSON({
          "event": "setImage",
          "context": jsn.context,
          "payload": {
            "image": img,
            "target": 0,
          }
        })
      })
      this.settings.title = 'Fetching'
      this.setTitle(jsn)
      aws.getPipelineState({ name: this.settings.pipelineId }, (err, data) => {
        if (data) {
          this.settings.codepipeline = {}
          this.settings.codepipeline[data.stageStates[0].stageName] = data.stageStates[0].latestExecution.status
          this.settings.codepipeline[data.stageStates[1].stageName] = data.stageStates[1].latestExecution.status
          this.settings.codepipeline[data.stageStates[2].stageName] = data.stageStates[2].latestExecution.status
          Utils.loadImage('./assets/success.png', img => {
            $SD.connection.sendJSON({
              "event": "setImage",
              "context": jsn.context,
              "payload": {
                "image": img,
                "target": 0,
              }
            })
          })
          // 判斷是否有選擇特定 stage
          switch (this.settings.pipelineStage) {
            case 'source': {
              this.settings.title = `Source\n${this.settings.codepipeline.Source}`
              break
            }
            case 'build': {
              this.settings.title = `Build\n${this.settings.codepipeline.Build}`
              break
            }
            case 'deploy': {
              this.settings.title = `Deploy\n${this.settings.codepipeline.Deploy}`
              break
            }
            case 'all': {
              const array = Object.values(this.settings.codepipeline)
              this.settings.title = array.join('\n')
              break
            }
            default: {
              const array = Object.values(this.settings.codepipeline)
              this.settings.title = array.join('\n')
              break
            }
          }
          this.setTitle(jsn)
          setTimeout(() => {
            action.init(jsn)
          }, 2500)
        } else {
          Utils.loadImage('./assets/error.png', img => {
            $SD.connection.sendJSON({
              "event": "setImage",
              "context": jsn.context,
              "payload": {
                "image": img,
                "target": 0,
              }
            })
          })
          this.settings.title = `Error`
          this.setTitle(jsn)
        }
      })
    }
  },

  onSendToPlugin: function (jsn) {
    const sdpi_collection = Utils.getProp(jsn, 'payload.sdpi_collection', {})
    if (sdpi_collection.value && sdpi_collection.value !== undefined) {
      this.logger({ [sdpi_collection.key]: sdpi_collection.value }, 'onSendToPlugin', 'fuchsia')
      var json = {
        "event": "setGlobalSettings",
        "context": jsn.context,
        "payload": { [sdpi_collection.key]: sdpi_collection.value }
      }
      $SD.connection.sendJSON(json)
    }
  },

  /**
   * This snippet shows how you could save settings persistantly to Stream Deck software.
   * It is not used in this example plugin.
   */

  saveSettings: function (jsn, sdpi_collection) {
    console.log('saveSettings:', jsn)
    if (sdpi_collection.hasOwnProperty('key') && sdpi_collection.key != '') {
      if (sdpi_collection.value && sdpi_collection.value !== undefined) {
        this.settings[sdpi_collection.key] = sdpi_collection.value
        console.log('setSettings....', this.settings)
        $SD.api.setSettings(jsn.context, this.settings)
      }
    }
  },

  /**
   * Here's a quick demo-wrapper to show how you could change a key's title based on what you
   * stored in settings.
   * If you enter something into Property Inspector's name field (in this demo),
   * it will get the title of your key.
   *
   * @param {JSON} jsn // The JSON object passed from Stream Deck to the plugin, which contains the plugin's context
   *
   */

  setTitle: function (jsn) {
    if (this.settings && this.settings.hasOwnProperty('title')) {
      console.log("setTitle:", this.settings.title)
      $SD.api.setTitle(jsn.context, this.settings.title)
    }
  },

  /**
   * Finally here's a method which gets called from various events above.
   * This is just an idea on how you can act on receiving some interesting message
   * from Stream Deck.
   */

  logger: function (inJsonData, caller, tagColor) {
    console.log('%c%s', `color: white; background: ${tagColor || 'grey'}; font-size: 15px;`, `[app.js]logger from: ${caller}`)
    // console.log(inJsonData)
  },


}

