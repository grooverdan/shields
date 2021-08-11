import Joi from 'joi'
import { BaseJsonService, NotFound } from '../index.js'
import { renderBuildStatusBadge } from '../build-status.js'

// http://docs.buildbot.net/current/developer/results.html#build-result-codes
const codeToText = [
  'success',
  'unstable', // warning actually
  'failure',
  'skipped',
  'infrastructure_failure', // exception - problem in buildbot
  'timeout', // retry - worker disconnection
  'cancelled',
]

const schema = Joi.object({
  builds: Joi.array()
    .items({
      results: Joi.number().required(),
    })
    .required(),
}).required()

export default class BuildbotBuilder extends BaseJsonService {
  static category = 'build'
  static route = { base: 'buildbot/builder', pattern: ':domain/:builder' }
  static examples = [
    {
      title: 'Builder status',
      namedParams: {
        domain: 'buildbot.mariadb.org',
        builder: 'amd64-rhel8-dockerlibrary',
      },
      staticPreview: this.render({ builder: 'example builder', status: 0 }),
      keywords: ['buildbot'],
    },
  ]

  static render({ builder, status }) {
    return renderBuildStatusBadge({
      label: builder,
      status: codeToText[status],
    })
  }

  async fetch({ domain, builder }) {
    const url = `https://${domain}/api/v2/builders/${builder}/builds?limit=1&order=-number`
    return this._requestJson({
      url,
      schema,
    })
  }

  async handle({ domain, builder }) {
    const data = await this.fetch({ domain, builder })
    if (data.builds.length === 0) {
      throw new NotFound({ prettyMessage: 'no such builder' })
    } else {
      return this.constructor.render({
        builder,
        status: data.builds[0].results,
      })
    }
  }
}
