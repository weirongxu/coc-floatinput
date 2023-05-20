import { displayHeight, FloatingWindow } from 'coc-helper'
import type {
  Disposable,
  ExtensionContext,
  WorkspaceConfiguration,
} from 'coc.nvim'
import { disposeAll, workspace } from 'coc.nvim'
import { events } from './events'
import { configLocal, logger } from './util'

type WinDirection =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'left-center'
  | 'right-center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

async function getWinDimension(
  direction: WinDirection,
  width: number,
  height: number,
): Promise<{
  width: number
  height: number
  left: number
  top: number
}> {
  const widthOutter = width + 2
  const heightOutter = height + 2
  const showtabline = (await workspace.nvim.getOption('showtabline')) as
    | 0
    | 1
    | 2
  const tabsCount = (await workspace.nvim.tabpages).length
  const lines = workspace.env.lines
  const columns = workspace.env.columns
  const topPos =
    showtabline === 0 ? 0 : showtabline === 2 || tabsCount > 1 ? 1 : 0
  let left = 0
  let top: number = topPos
  if (direction === 'top-left') {
    top = topPos
    left = 0
  } else if (direction === 'top-center') {
    top = topPos
    left = (columns - widthOutter) / 2
  } else if (direction === 'top-right') {
    top = topPos
    left = columns - widthOutter
  } else if (direction === 'bottom-left') {
    top = lines - heightOutter
    left = 0
  } else if (direction === 'bottom-center') {
    top = lines - heightOutter
    left = (columns - widthOutter) / 2
  } else if (direction === 'bottom-right') {
    top = lines - heightOutter
    left = (columns - widthOutter) / 2
  } else if (direction === 'left-center') {
    top = (lines - heightOutter) / 2
    left = 0
  } else if (direction === 'right-center') {
    top = (lines - heightOutter) / 2
    left = columns - widthOutter
  }
  return { top, left, width, height }
}

export class CocStatusManager implements Disposable {
  static async create(
    context: ExtensionContext,
    config: WorkspaceConfiguration,
  ): Promise<CocStatusManager> {
    const disposables: Disposable[] = []
    return new CocStatusManager(context, config, disposables)
  }

  protected constructor(
    protected context: ExtensionContext,
    protected config: WorkspaceConfiguration,
    protected disposables: Disposable[] = [],
  ) {}

  dispose(): void {
    disposeAll(this.disposables)
  }

  protected _floatWin?: FloatingWindow
  protected async floatWin(): Promise<FloatingWindow> {
    if (!this._floatWin) {
      this._floatWin = await FloatingWindow.create({
        mode: 'show',
      })
    }
    return this._floatWin
  }

  protected autoCloseTimer?: NodeJS.Timeout

  public async show(): Promise<void> {
    const status = (await workspace.nvim.getVar('coc_status')) as string
    if (!status) {
      return
    }

    const lines = [status]

    const direction = this.config.get<WinDirection>('status.direction')!
    const width = this.config.get<number>('status.width')!
    const timeout = this.config.get<number>('status.timeout')!
    const height = await displayHeight(width, lines)
    const dimension = await getWinDimension(direction, width, height)

    const floatWin = await this.floatWin()
    const options: FloatingWindow.OpenOptions = {
      title: 'coc-status',
      ...dimension,
      border: [],
      lines,
    }
    if (await floatWin.opened()) {
      await floatWin.resize(options)
    } else {
      await floatWin.open(options)
    }
    await floatWin.setLines({ ...options, lines })

    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer)
    }

    this.autoCloseTimer = setTimeout(() => {
      this.hide().catch(logger.error)
    }, timeout)
  }

  public async hide(): Promise<void> {
    await this._floatWin?.close()
  }

  public async enable(): Promise<void> {
    this.config = configLocal()

    this.disposables.push(
      events.on('CocStatusChange', () => {
        this.show().catch(logger.error)
      }),
    )
  }

  public async disable(): Promise<void> {}
}
