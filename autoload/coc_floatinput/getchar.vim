let s:activated = 0

function s:getc()
  try
    let c = getchar()
    return type(c) == type(0) ? nr2char(c) : c
  catch /^Vim:Interrupt$/
    return "\<C-c>"
  endtry
endfunction

function coc_floatinput#getchar#start_prompt()
  if s:activated
    return
  endif
  let s:activated = 1
  while s:activated
    let ch = s:getc()
    if ch ==# "\<FocusLost>" || ch ==# "\<FocusGained>" || ch ==# "\<CursorHold>"
      continue
    else
      call CocActionAsync('runCommand', 'floatinput.internal.inputchar', ch, getcharmod())
    endif
  endwhile
endfunction

function coc_floatinput#getchar#stop_prompt()
  if s:activated
    let s:activated = 0
    call feedkeys("\<C-c>")
  endif
endfunction
