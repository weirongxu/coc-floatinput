import { activateHelper, registerRuntimepath } from 'coc-helper'
import type { ExtensionContext } from 'coc.nvim'
import { commands, window, workspace } from 'coc.nvim'
import { Confirm } from './Components/Confirm'
import { Input } from './Components/Input'
import { IntInput } from './Components/IntInput'
import { NumberInput } from './Components/NumberInput'
import { StringInput } from './Components/StringInput'
import { registerEvents } from './events'
import { FloatingUI } from './FloatingUI'
import {
  CocCommandProvider,
  ListProvider,
  VimCommandProvider,
} from './ListProvider'
import { CocStatusManager } from './status'
import { configLocal, logger } from './util'

export const FloatInput = {
  components: {
    Input,
    StringInput,
    NumberInput,
    IntInput,
    Confirm,
  },
  ListProvider,
  FloatingUI,
}

export type FloatInputType = typeof FloatInput | undefined

export async function activate(
  context: ExtensionContext,
): Promise<FloatInputType> {
  if (workspace.isVim) {
    await window.showWarningMessage('coc-floatinput only support neovim')
    return
  }

  const { subscriptions } = context

  await activateHelper(context)

  const input = new StringInput()

  /**
   * Vim command
   */
  async function vimCommand() {
    const content = await input.input({
      title: 'command',
      relative: 'center',
      filetype: 'floatinput_command',
      completion: {
        short: 'C',
        provider: new VimCommandProvider(),
      },
    })

    if (!content) {
      return
    }

    return workspace.nvim.command(content)
  }
  subscriptions.push(
    input,
    commands.registerCommand('floatinput.command', () => {
      vimCommand().catch(logger.error)
    }),
    workspace.registerKeymap(['n', 'i'], 'floatinput-command', () => {
      vimCommand().catch(logger.error)
    }),
  )

  /**
   * Coc command
   */
  async function cocCommand() {
    const content = await input.input({
      title: 'coc-command',
      relative: 'center',
      filetype: 'floatinput_coc_command',
      completion: {
        short: 'C',
        provider: new CocCommandProvider(),
      },
    })

    if (!content) {
      return
    }

    return commands.executeCommand(content)
  }
  subscriptions.push(
    input,
    commands.registerCommand('floatinput.coc.command', () => {
      cocCommand().catch(logger.error)
    }),
    workspace.registerKeymap(['n', 'i'], 'floatinput-coc-command', () => {
      cocCommand().catch(logger.error)
    }),
  )

  registerEvents(context)
  await registerRuntimepath(context)

  const config = configLocal()
  const cocStatusManager = await CocStatusManager.create(context, config)
  if (config.get<boolean>('status.enabled')!) {
    await cocStatusManager.enable()
  }

  return FloatInput
}
