# coc-floatinput

Floating input for coc.nvim

**Node**: Vim popupwin doesn't support the focus feature, So this extension only works on neovim

## Install

`:CocInstall coc-floatinput`

## Keymaps

`nmap <silent> <Leader>: <Plug>(coc-floatinput-command)`

`nmap <silent> <Leader>c: <Plug>(coc-floatinput-coc-command)`

`nmap <silent> <Leader>rn <Plug>(coc-floatinput-rename)`

## Highlight

```vim
autocmd ColorScheme *
      \ hi CocHelperNormalFloatBorder guifg=#dddddd guibg=#575B54
      \ | hi CocHelperNormalFloat guibg=#575B54
```

## FloatingUI API

TODO API doc and screenshot

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
  function! s:is_float(winnr) abort
    let winid = win_getid(a:winnr)
    return !empty(nvim_win_get_config(winid)['relative'])
  endfunction

  function s:quit()
    let nr = winnr('$')
    while nr > 0
      if !s:is_float(nr)
        if nr == 1
          call coc#util#close_floats()
          break
        endif
      endif
      let nr -= 1
    endwhile
    :quit
  endfunction

  nmap <silent> <c-w>q :call <SID>quit()<CR>
  nmap <silent> ZZ :call <SID>quit()<CR>
endif
```

## Configurations

TODO status

## Screenshot

![image](https://user-images.githubusercontent.com/1709861/90628942-13c30e00-e251-11ea-81af-683363ae5370.png)
![image](https://user-images.githubusercontent.com/1709861/90628904-03ab2e80-e251-11ea-97c7-5eec56b7821f.png)

## License

MIT

---

> This extension is created by [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
