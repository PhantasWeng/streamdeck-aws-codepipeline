<template>
  <div v-if="connected" class="mx-4">
    <hr class="border-neutral-600 mb-2">
    <div class="ml-16">
      <div>
        <div class="text-sm text-white font-bold">AWS Credentials</div>
        <div>
          <label class="text-xs text-white">Access Key Id</label>
          <input v-model="awsConfig.accessKeyId" type="text" class="w-full rounded-sm text-xs p-1">
        </div>
        <div>
          <label class="text-xs text-white">Secret Access Key</label>
          <input v-model="awsConfig.secretAccessKey" type="password" class="w-full rounded-sm text-xs p-1">
        </div>
        <div>
          <label class="text-xs text-white">Region</label>
          <select v-model="awsConfig.region" class="w-full rounded-sm text-sm p-1">
            <option value="">All</option>
            <optgroup v-for="group in Object.keys(AWSRegions)" :label="group" :key="group">
              <option v-for="region in AWSRegions[group]" :value="region" :key="region">{{ region }}</option>
            </optgroup>
          </select>
        </div>
        <div v-if="!isAwsCredentialsCorrect" class="mt-2 text-xs text-red-500">Pleas Check Your Credentials.</div>
        <button class="py-1 px-2 my-2 bg-white rounded-sm text-xs" @click="saveAWSCredentials">save</button>
        <details class="mt-2">
          <summary class="text-xs text-gray-300 cursor-pointer focus:outline-0">How to get your AWS Credentials</summary>
          <p class="border border-neutral-600 my-2 p-2 text-neutral-400 text-xs">
            Tip:<br>
            Get your AWS Credentials information from <span class="cursor-pointer underline" @click="openAwsIAMPage">security_credential</span> page.<br>
            For more information, pleas check <span class="cursor-pointer underline" @click="openAwsCredentialsPage">AWS credentials document</span>.
          </p>
        </details>
      </div>
      <hr class="border-neutral-600 my-2">
      <div v-show="isAwsCredentialsCorrect">
        <div class="text-sm text-white font-bold">Pipeline</div>
        <div>
          <label class="text-xs text-white">Pipeline Name</label>
          <div class="flex items-center">
            <input v-model="pipelineConfig.name" type="text" class="flex-1 rounded-sm text-xs p-1" placeholder="Type the pipeline name">
          </div>
          <div class="bg-neutral-800 text-white mt-2">
            <template v-for="(pipeline, index) in filteredPipeline">
              <div v-if="index <= 3 && pipelineConfig.name !== pipeline" class="px-2 text-xs cursor-pointer hover:text-blue-300" @click="pipelineConfig.name = pipeline" :key="pipeline">{{ pipeline }}</div>
            </template>
            <div v-if="filteredPipeline.length > 3" class="text-xs">...<span style="font-size: 12px;">({{ filteredPipeline.length - 3 }})</span></div>
          </div>
        </div>
        <div v-if="isPipelineAvailable">
          <label class="text-xs text-white">Stage</label>
          <select v-model="pipelineConfig.stage" class="w-full rounded-sm text-sm p-1 disabled:bg-neutral-300" :disabled="isLoadingAvailableStage">
            <option value="" key="">{{ availableStage.length ? 'All' : '---' }}</option>
            <option v-for="stage in availableStage" :value="stage" :key="stage">{{ stage }}</option>
          </select>
        </div>
        <div class="bg-neutral-800 text-white mt-2 px-2 text-xs">
          <div v-for="result in stateResult" :key="result">{{ result }}</div>
        </div>
        <button class="py-1 p-2 my-2 bg-white rounded-sm text-xs" @click="savePipelineConfig">save and test</button>
      </div>
    </div>
  </div>
  <div v-else>
    <div class="flex items-center justify-center" style="min-height: 130px">
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  </div>
</template>

<script>
import StreamDeck from '@/modules/common/streamdeck'
import AWSRegions from '@/modules/aws/regions'

export default {
  name: 'Pi',
  components: {},
  props: {},
  data: () => {
    return {
      $SD: null,
      connected: false,
      AWSRegions: {},
      awsConfig: {
        accessKeyId: '',
        secretAccessKey: '',
        region: ''
      },
      isAwsCredentialsCorrect: false,
      availablePipelines: [],
      availableStage: [],
      pipelineConfig: {
        name: '',
        stage: ''
      },
      isLoadingAvailablePipeline: true,
      isPipelineAvailable: false,
      isLoadingAvailableStage: false,
      stateResult: {},
      globalSettings: {},
      actionSettings: {},
      AWS: null
    }
  },
  created: function () {
    this.AWSRegions = AWSRegions
    window.connectElgatoStreamDeckSocket = (inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) => {
      this.$SD = new StreamDeck(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo)
      this.actionSettings = JSON.parse(inActionInfo).payload.settings

      this.$SD.on('connected', () => {
        console.debug('connected')
        this.connected = true
        this.$SD.requestGlobalSettings()
      })

      this.$SD.on('propertyInspectorDidAppear', () => {
        console.debug('propertyInspectorDidAppear')
      })

      console.debug('actionSettings', this.actionSettings)
      if (this.actionSettings.pipelineConfig) {
        this.pipelineConfig = { ...this.actionSettings.pipelineConfig }
      }

      this.$SD.on('globalsettings', (globalSettings) => {
        if (globalSettings) {
          console.debug('globalsettings', globalSettings)
          this.globalSettings = globalSettings
          if (globalSettings.awsConfig) {
            this.awsConfig = globalSettings.awsConfig
            this.setAWSConfig()
          }
        }
      })
    }
  },
  computed: {
    filteredPipeline: function () {
      return this.availablePipelines.filter(pipeline => pipeline.includes(this.pipelineConfig.name))
    }
  },
  methods: {
    saveAWSCredentials: function () {
      this.saveGlobalSettings({ awsConfig: this.awsConfig })
      this.setAWSConfig()
    },
    savePipelineConfig: function () {
      console.log(this.pipelineConfig)
      this.saveSettings({ pipelineConfig: this.pipelineConfig })
      this.getPipelineStates()
    },
    saveGlobalSettings: function (payload) {
      this.$SD.saveGlobalSettings(payload)
    },
    saveSettings: function (actionSettings) {
      this.$SD.saveSettings(actionSettings)
    },
    setAWSConfig: function () {
      window.AWS.config.update(this.awsConfig)
      this.init()
    },
    init: function () {
      this.getAvailablePipeline()
    },
    getAvailablePipeline: function () {
      this.isLoadingAvailablePipeline = true
      const codePipeline = new window.AWS.CodePipeline()
      codePipeline.listPipelines({}, (err, data) => {
        if (data) {
          this.isAwsCredentialsCorrect = true
          this.availablePipelines = data.pipelines.map(pipeline => pipeline.name)
          if (this.pipelineConfig.name) {
            this.fetchAvailableStage(this.pipelineConfig.name)
          }
        }
        if (err) {
          this.isAwsCredentialsCorrect = false
        }
        this.isLoadingAvailablePipeline = false
      })
    },
    fetchAvailableStage: function (pipelineName) {
      if (pipelineName) {
        if (this.availablePipelines.find(pipeline => pipeline === pipelineName)) {
          this.isLoadingAvailableStage = true
          this.isPipelineAvailable = false
          const codePipeline = new window.AWS.CodePipeline()
          codePipeline.getPipeline({ name: pipelineName }, (err, data) => {
            if (data) {
              this.availableStage = data.pipeline.stages.map(stage => {
                return stage.name
              })
              this.isPipelineAvailable = true
            }
            if (err) {
              this.availableStage = []
              this.isPipelineAvailable = false
            }
            this.isLoadingAvailableStage = false
          })
        } else {
          this.availableStage = []
          this.isPipelineAvailable = false
        }
      } else {
        this.availableStage = []
        this.isPipelineAvailable = false
      }
    },
    getPipelineStates: function () {
      const codePipeline = new window.AWS.CodePipeline()
      codePipeline.getPipelineState({ name: this.pipelineConfig.name }, (err, data) => {
        if (err) {
          console.log(err)
        }
        if (data) {
          let result = []
          if (this.pipelineConfig.stage === '') {
            result = data.stageStates
          } else {
            result = data.stageStates.filter(state => state.stageName === this.pipelineConfig.stage)
          }
          this.stateResult = result.map(stage => {
            return `${stage.stageName} ${stage.latestExecution.status}`
          })
        }
      })
    },
    openAwsIAMPage: function () {
      this.$SD.openUrl('https://console.aws.amazon.com/iam/home?#security_credential')
    },
    openAwsCredentialsPage: function () {
      this.$SD.openUrl('https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html#email-and-password-for-your-account')
    }
  },
  watch: {
    'pipelineConfig.name': {
      handler: function (val) {
        this.fetchAvailableStage(val)
      },
      immediate: true
    }
    // availableStage: {
    //   handler: function (stages) {
    //     if (!stages || !stages.find(stage => stage === this.pipelineConfig.stage)) {
    //       this.pipelineConfig.stage = ''
    //     }
    //   },
    //   immediate: true
    // }
  }
}
</script>

<style lang="sass">
body
  background-color: #2D2D2D
</style>
