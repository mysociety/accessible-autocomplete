import { h, Component } from 'preact' /** @jsx h */
import Status from './status'

const kc = {
  13: 'enter',
  27: 'escape',
  38: 'up',
  40: 'down'
}

function isIosDevice () {
  return navigator.userAgent.match(/(iPod|iPhone|iPad)/g) && navigator.userAgent.match(/AppleWebKit/g)
}

export default class Typeahead extends Component {
  static defaultProps = {
    autoselect: false,
    cssNamespace: 'typeahead',
    id: 'typeahead',
    minLength: 0,
    name: 'input-typeahead'
  }

  elementRefs = {}

  state = {
    menuOpen: false,
    options: [],
    query: '',
    focused: null
  }

  constructor (props) {
    super(props)

    this.handleComponentBlur = this.handleComponentBlur.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleUpArrow = this.handleUpArrow.bind(this)
    this.handleDownArrow = this.handleDownArrow.bind(this)
    this.handleEnter = this.handleEnter.bind(this)

    this.handleOptionClick = this.handleOptionClick.bind(this)
    this.handleOptionFocusOut = this.handleOptionFocusOut.bind(this)
    this.handleOptionFocus = this.handleOptionFocus.bind(this)
    this.handleOptionMouseDown = this.handleOptionMouseDown.bind(this)

    this.handleInputBlur = this.handleInputBlur.bind(this)
    this.handleInputChange = this.handleInputChange.bind(this)
    this.handleInputFocus = this.handleInputFocus.bind(this)

    this.pollInputElement = this.pollInputElement.bind(this)
    this.getDirectInputChanges = this.getDirectInputChanges.bind(this)
  }

  componentDidMount () {
    this.pollInputElement()
  }

  componentWillUnmount () {
    clearTimeout(this.$pollInput)
  }

  // Applications like Dragon NaturallySpeaking will modify the
  // `input` field by directly changing its `.value`. These events
  // don't trigger our JavaScript event listeners, so we need to poll
  // to handle when and if they occur.
  pollInputElement () {
    this.getDirectInputChanges()
    this.$pollInput = setTimeout(() => {
      this.pollInputElement()
    }, 100)
  }

  getDirectInputChanges () {
    const inputRef = this.elementRefs[-1]
    const queryHasChanged = inputRef.value !== this.state.query
    if (queryHasChanged) {
      this.handleInputChange({ target: { value: inputRef.value } })
    }
  }

  componentDidUpdate (prevProps, prevState) {
    const { focused } = this.state
    const componentLostFocus = focused === null
    const focusedChanged = prevState.focused !== focused
    const focusDifferentElement = focusedChanged && !componentLostFocus
    if (focusDifferentElement) {
      this.elementRefs[focused].focus()
    }
    const focusedInput = focused === -1
    const componentGainedFocus = focusedChanged && prevState.focused === null
    const selectAllText = focusedInput && componentGainedFocus
    if (selectAllText) {
      const inputEl = this.elementRefs[focused]
      inputEl.setSelectionRange(0, inputEl.value.length)
    }
  }

  handleComponentBlur (options) {
    this.setState({
      menuOpen: !!(options && options.menuOpen),
      focused: null
    })
  }

  handleOptionFocusOut (evt, idx) {
    const { menuOpen, focused } = this.state
    const focusingOutsideComponent = evt.relatedTarget === null
    const focusingAnotherOption = focused !== idx
    const keepMenuOpen = menuOpen && isIosDevice()
    if (focusingOutsideComponent || !focusingAnotherOption) {
      this.handleComponentBlur({
        menuOpen: keepMenuOpen
      })
    }
  }

  handleInputBlur (evt) {
    const focusingAnOption = this.state.focused !== -1
    if (!focusingAnOption) {
      const keepMenuOpen = this.state.menuOpen && isIosDevice()
      this.handleComponentBlur({
        menuOpen: keepMenuOpen
      })
    }
  }

  handleInputChange (evt) {
    const { minLength, source } = this.props
    const query = evt.target.value
    const queryEmpty = query.length === 0
    const queryChanged = this.state.query.length !== query.length
    const queryLongEnough = query.length >= minLength

    this.setState({ query })

    const searchForOptions = !queryEmpty && queryChanged && queryLongEnough
    if (searchForOptions) {
      source(query, (options) => {
        this.setState({
          menuOpen: options.length > 0,
          options
        })
      })
    } else if (queryEmpty) {
      this.setState({ menuOpen: false })
    }
  }

  handleInputFocus (evt) {
    this.setState({ focused: -1 })
  }

  handleOptionFocus (idx) {
    this.setState({ focused: idx })
  }

  handleOptionClick (evt, idx) {
    this.setState({
      menuOpen: false,
      query: this.state.options[idx],
      focused: -1
    })
  }

  handleOptionMouseDown (evt) {
    // Safari triggers focusOut before click, but if you
    // preventDefault on mouseDown, you can stop that from happening.
    // If this is removed, clicking on an option in Safari will trigger
    // `handleOptionFocusOut`, which closes the menu, and the click will
    // trigger on the element underneath instead.
    // See: http://stackoverflow.com/questions/7621711/how-to-prevent-blur-running-when-clicking-a-link-in-jquery
    evt.preventDefault()
  }

  handleUpArrow (evt) {
    evt.preventDefault()
    const { menuOpen, focused } = this.state
    const isNotAtTop = focused !== -1
    const allowMoveUp = isNotAtTop && menuOpen
    if (allowMoveUp) {
      this.handleOptionFocus(focused - 1)
    }
  }

  handleDownArrow (evt) {
    evt.preventDefault()
    const { autoselect } = this.props
    const { menuOpen, options, focused } = this.state
    const isNotAtBottom = focused !== options.length - 1
    const moreThanOneOption = options.length > 1
    const allowMoveDown = isNotAtBottom && menuOpen && (!autoselect || autoselect && moreThanOneOption)
    if (allowMoveDown) {
      const inputFocused = focused === -1
      const jumpToSecond = autoselect && inputFocused
      const nextFocused = jumpToSecond ? 1 : focused + 1
      this.handleOptionFocus(nextFocused)
    }
  }

  handleEnter (evt) {
    evt.preventDefault()

    if (this.state.menuOpen) {
      this.handleOptionClick(evt, this.state.focused)
    }
  }

  handleKeyDown (evt) {
    switch (kc[evt.keyCode]) {
      case 'up':
        this.handleUpArrow(evt)
        break
      case 'down':
        this.handleDownArrow(evt)
        break
      case 'enter':
        this.handleEnter(evt)
        break
      case 'escape':
        this.handleComponentBlur(evt)
        break
      default:
        break
    }
  }

  render () {
    const { autoselect, cssNamespace, id, minLength, name } = this.props
    const { menuOpen, options, query, focused } = this.state

    const Wrapper = ({ children }) =>
      <div
        onKeyDown={this.handleKeyDown}
        style={{ 'position': 'relative' }}
      >
        { children }
      </div>

    const Input = () =>
      <input
        aria-activedescendant={focused !== -1 && focused !== null ? `${id}__option--${focused}` : false}
        aria-expanded={menuOpen}
        aria-owns={`${id}__listbox`}
        className={`${cssNamespace}__input`}
        id={id}
        name={name}
        onBlur={this.handleInputBlur}
        onFocus={this.handleInputFocus}
        onInput={this.handleInputChange}
        role='combobox'
        style={{ 'position': 'relative' }}
        type='text'
        value={query}
      />

    const Menu = ({ children }) =>
      <ul
        className={`${cssNamespace}__menu`}
        id={`${id}__listbox`}
        role='listbox'
        style={{
          'display': (menuOpen) ? 'block' : 'none',
          'left': '0',
          'position': 'absolute',
          'top': '100%',
          'zIndex': '100'
        }}
      >
        { children }
      </ul>

    const Option = ({ children, idx }) => {
      const cn = `${cssNamespace}__option`
      const inputIsFocused = focused === -1
      const isFirstOption = idx === 0
      const autofocus = autoselect && inputIsFocused && isFirstOption
      const optionIsFocused = focused === idx
      const focusThisOption = autofocus || optionIsFocused
      const cns = `${cn}${focusThisOption ? ` ${cn}--focused` : ''}`
      return <li
        aria-selected={focused === idx}
        className={cns}
        id={`${id}__option--${idx}`}
        onClick={(evt) => this.handleOptionClick(evt, idx)}
        onFocusOut={(evt) => this.handleOptionFocusOut(evt, idx)}
        onMouseDown={this.handleOptionMouseDown}
        onMouseMove={() => this.handleOptionFocus(idx)}
        role='option'
        tabindex='-1'
      >
        { children }
      </li>
    }

    return (
      <Wrapper>
        <Input
          ref={(inputEl) => { this.elementRefs[-1] = inputEl }}
        />
        <Menu>
          {options.map((optionText, idx) =>
            <Option
              idx={idx}
              ref={(optionEl) => { this.elementRefs[idx] = optionEl }}
            >
              { optionText }
            </Option>
          )}
        </Menu>
        <Status
          length={options.length}
          queryLength={query.length}
          minQueryLength={minLength}
        />
      </Wrapper>
    )
  }
}
