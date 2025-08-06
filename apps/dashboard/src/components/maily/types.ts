export enum VariableFrom {
  // variable coming from bubble menu (e.g. 'showIf')
  Bubble = 'bubble-variable',
  // variable coming from repeat block 'each' input
  RepeatEachKey = 'repeat-variable',
  // all the other variables
  Content = 'content-variable',
  // variables inside Button component
  Button = 'button-variable',
}
