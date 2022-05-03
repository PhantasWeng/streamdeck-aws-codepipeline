export default class StreamDeck {
  constructor (inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
    const actionInfo = JSON.parse(inActionInfo)

    this.propertyInspectorUUID = inPropertyInspectorUUID
    this.events = ELGEvents.eventEmitter()

    this.streamDeckWebsocket = new WebSocket('ws://localhost:' + inPort)
    this.streamDeckWebsocket.onopen = () => {
      const json = {
        event: inRegisterEvent,
        uuid: inPropertyInspectorUUID
      }
      this.streamDeckWebsocket.send(JSON.stringify(json))
      this.events.emit('connected', actionInfo)
    }

    this.on = (evt, fn) => this.events.on(evt, fn)

    this.streamDeckWebsocket.onmessage = (evt) => {
      const incomingEvent = JSON.parse(evt.data)
      switch (incomingEvent.event) {
        case 'deviceDidConnect':
          this.events.emit('deviceDidConnect', incomingEvent)
          break
        case 'willAppear':
          this.events.emit('willAppear', incomingEvent)
          break
        case 'willDisappear':
          this.events.emit('willDisappear', incomingEvent)
          break
        case 'didReceiveGlobalSettings':
          this.events.emit('globalsettings', incomingEvent.payload.settings)
          break
        case 'didReceiveSettings':
          this.events.emit('didReceiveSettings', incomingEvent)
          break
        case 'keyDown':
          this.events.emit('keyDown', incomingEvent)
          break
        case 'keyUp':
          this.events.emit('keyUp', incomingEvent)
          break
        case 'sendToPlugin':
          console.log(incomingEvent)
          this.events.emit('sendToPlugin', incomingEvent)
          break
        case 'titleParametersDidChange':
          this.events.emit('titleParametersDidChange', incomingEvent)
          break
        default:
          console.log(`Unhandled Event: ${incomingEvent.event}`)
          break
      }
    }
  }

  send (payload) {
    this.streamDeckWebsocket.send(JSON.stringify(payload))
  }

  openUrl (url) {
    this.streamDeckWebsocket.send(JSON.stringify({
      event: 'openUrl',
      payload: {
        url: url
      }
    }))
  }

  requestGlobalSettings () {
    const getGlobalSettingsMessage = {
      event: 'getGlobalSettings',
      context: this.propertyInspectorUUID
    }
    this.streamDeckWebsocket.send(JSON.stringify(getGlobalSettingsMessage))
  }

  saveGlobalSettings (payload) {
    const message = {
      event: 'setGlobalSettings',
      context: this.propertyInspectorUUID,
      payload: payload
    }

    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  requestSettings (context) {
    console.log('requestSettings', context)
    const getSettingsMessage = {
      event: 'getSettings',
      context: context
    }
    this.streamDeckWebsocket.send(JSON.stringify(getSettingsMessage))
  }

  saveSettings (actionSettings) {
    const message = {
      event: 'setSettings',
      context: this.propertyInspectorUUID,
      payload: actionSettings
    }
    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  setTitle (context, title) {
    const message = {
      event: 'setTitle',
      context: context,
      payload: {
        title: title,
        target: ['software', 'hardware'],
        titleParameters: {
          fontSize: 18
        }
      }
    }
    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  setImage (context, image) {
    const message = {
      event: 'setImage',
      context: context,
      payload: {
        image: image,
        target: ['software', 'hardware'],
        state: 0
      }
    }

    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  showAlert (context) {
    const message = {
      event: 'showAlert',
      context: context
    }

    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  showOk (context) {
    const message = {
      event: 'showOk',
      context: context
    }

    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  /**
   * @param number 0-based index of state to set.
   */
  setState (context, number) {
    const message = {
      event: 'setState',
      context: context,
      payload: {
        state: number
      }
    }

    this.streamDeckWebsocket.send(JSON.stringify(message))
  }
}

const ELGEvents = {
  eventEmitter: function () {
    const eventList = new Map()

    const on = (name, fn) => {
      if (!eventList.has(name)) eventList.set(name, ELGEvents.pubSub())

      return eventList.get(name).sub(fn)
    }

    const has = (name) =>
      eventList.has(name)

    const emit = (name, data) =>
      eventList.has(name) && eventList.get(name).pub(data)

    return Object.freeze({ on, has, emit, eventList })
  },

  pubSub: function pubSub () {
    const subscribers = new Set()

    const sub = fn => {
      subscribers.add(fn)
      return () => {
        subscribers.delete(fn)
      }
    }

    const pub = data => subscribers.forEach(fn => fn(data))
    return Object.freeze({ pub, sub })
  }
}
