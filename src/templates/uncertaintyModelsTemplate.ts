export const UNCERTAINTY_MODELS_TEMPLATE = `# Uncertainty & Models: explore a forecast without leaving the sheet

# Both numbers are native scrubbers: drag the centre or the tolerance.
visits = 10000 ± 2000
conversion = 3% ± 0.5%
price = 49 EUR

# A model gives a multi-step idea a name while keeping every step visible.
model Revenue(visits, conversion, price):
  buyers = visits * conversion
  return buyers * price

forecast = Revenue(visits, conversion, price) =>

# Put the caret on the forecast line to see the current values substituted.
# The shaded envelope is the propagated possible range.
@view plot x=price y=forecast domain=20..80 size=md

# Select the three values below: SmartPad offers sum, mean, min, and max
# beside the text. Choosing one inserts an ordinary live expression.
conservative = 9800 EUR
expected = 14700 EUR
optimistic = 20580 EUR`;
