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

## Screenshot

![image](https://user-images.githubusercontent.com/1709861/90628942-13c30e00-e251-11ea-81af-683363ae5370.png)
![image](https://user-images.githubusercontent.com/1709861/90628904-03ab2e80-e251-11ea-97c7-5eec56b7821f.png)

## License

MIT

---

> This extension is created by [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
