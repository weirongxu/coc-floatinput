# coc-floatinput

Floating input for coc.nvim

**Note**: Vim popupwin doesn't support the focus feature, So this extension only works on neovim

## Install

`:CocInstall coc-floatinput`

## Keymaps

`nmap <silent> <Leader>: <Plug>(coc-floatinput-command)`

`nmap <silent> <Leader>c: <Plug>(coc-floatinput-coc-command)`

~~`nmap <silent> <Leader>rn <Plug>(coc-floatinput-rename)` removed, see https://github.com/weirongxu/coc-floatinput/issues/21~~

### Screenshots

<img src="https://user-images.githubusercontent.com/1709861/90628904-03ab2e80-e251-11ea-97c7-5eec56b7821f.png" width="400">
<img src="https://user-images.githubusercontent.com/1709861/90628942-13c30e00-e251-11ea-81af-683363ae5370.png" width="400">

## Highlight

```vim
autocmd ColorScheme *
      \ hi CocHelperNormalFloatBorder guifg=#dddddd guibg=#575B54
      \ | hi CocHelperNormalFloat guibg=#575B54
```

## API

Use coc-floatinput API in other extensions

```typescript
// Get coc-floatinput API

// input FloatInputType only
import type { FloatInputType } from 'coc-floatinput';

import { extensions } from 'coc.nvim';

let floatInputExt: FloatInputType | undefined;

async function getFloatInputApi() {
  if (!floatInputExt) {
    floatInputExt = extensions.all.find((e) => e.id === 'coc-floatinput') as
      | Extension<FloatInputType>
      | undefined;
  }
  return floatInputExt?.exports;
}
```

### FloatingUI

```typescript
// Get FloatingUI
async function getFloatUI() {
  return (await getFloatInputApi())?.FloatingUI;
}
```

#### string input

```typescript
const FloatUI = await getFloatUI();
await FloatUI?.stringInput({
  prompt: 'Input your string',
  defaultValue: 'default string',
});
```

<img src="https://user-images.githubusercontent.com/1709861/96014948-8cbd9b00-0e79-11eb-8409-fbc31a0fcc76.png" width="300">

#### number input

```typescript
const FloatUI = await getFloatUI();
await FloatUI?.numberInput({
  prompt: 'Input your number',
  defaultValue: 1,
});
```

<img src="https://user-images.githubusercontent.com/1709861/96015085-bd9dd000-0e79-11eb-979d-b89480554fb2.png" width="300">

#### confirm

```typescript
const FloatUI = await getFloatUI();
await FloatUI?.confirm({
  prompt: 'Are you sure',
  values: ['yes', 'no', 'skip'],
  defaultValue: 'yes',
});
```

<img src="https://user-images.githubusercontent.com/1709861/96015199-defebc00-0e79-11eb-9a9c-18288fd34718.png" width="300">

## Status window

Enable floatinput status window.

coc-settings.json

```json
{
  "floatinput.status.enabled": true
}
```

Avoid `only floating window` error

```vim
if has('nvim')
  function! s:is_float(winnr)
    let winid = win_getid(a:winnr)
    return !empty(nvim_win_get_config(winid)['relative'])
  endfunction

  function! s:quit_pre()
    let cur_nr = winnr()
    if s:is_float(cur_nr)
      return
    endif
    let last_nr = winnr('$')
    for nr in range(last_nr, 1, -1)
      if s:is_float(nr)
        continue
      endif
      if nr == 1
        only
      else
        break
      endif
    endfor
  endfunction

  autocmd QuitPre * call <SID>quit_pre()
endif
```

## License

MIT

---

> This extension is created by [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
