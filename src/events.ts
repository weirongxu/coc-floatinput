import { HelperEventEmitter } from 'coc-helper'
import type { ExtensionContext } from 'coc.nvim'
import { commands, workspace } from 'coc.nvim'
import type { CharMode } from './getchar'
import { getcharEvents } from './getchar'
import { logger } from './util'

type Event = {
  CocStatusChange: () => void
}

export const events = new HelperEventEmitter<Event>(logger)

export function registerEvents(context: ExtensionContext): void {
  context.subscriptions.push(
    workspace.registerAutocmd({
      event: 'User CocStatusChange',
      callback() {
        events.fire('CocStatusChange').catch(logger.error)
      },
    }),
    commands.registerCommand(
      'floatinput.internal.inputchar',
      (ch: string, mode: CharMode) => {
        getcharEvents.fire('InputChar', ch, mode).catch(logger.error)
      },
      undefined,
      true,
    ),
  )
}
