import React from "react";
import { useEditorContext } from "../Editor";
import "./TemplatePanel.css";

// Template data with modern variable names (spaces and phrases)
const templates = [
  {
    id: "rent",
    emoji: "🏠",
    name: "Rent Calculator",
    content: `base rent = 1250
utilities = 185
internet = 75
monthly total = base rent + utilities + internet =>
yearly total = monthly total * 12 =>`
  },
  {
    id: "pizza",
    emoji: "🍕",
    name: "Pizza Party",
    content: `pizza total cost=18.99
number of friends=6
tip percentage=0.18
cost per person = pizza total cost / number of friends =>
tip per person = cost per person * tip percentage =>
total per person = cost per person + tip per person =>`,
  },
  {
    id: "roadtrip",
    emoji: "⛽",
    name: "Road Trip",
    content: `trip distance=380
car mpg=28.5
gas price per gallon=3.45
gallons needed = trip distance / car mpg =>
total fuel cost = gallons needed * gas price per gallon =>
cost per mile = total fuel cost / trip distance =>`,
  },
  {
    id: "phone",
    emoji: "📱",
    name: "Phone Bill",
    content: `base plan cost=45
data used gb=8.2
data limit gb=10
overage rate per gb=10
data overage = max(0, data used gb - data limit gb) * overage rate per gb =>
final phone bill = base plan cost + data overage =>`,
  },
  {
    id: "fitness",
    emoji: "🏋️",
    name: "Fitness Goal",
    content: `current weight=165
height in inches=68
current age=28
body mass index = current weight / (height in inches * height in inches) * 703 =>
daily calorie needs = 10 * current weight + 6.25 * height in inches - 5 * current age + 5 =>
weekly calorie deficit = 500 * 7 =>`,
  },
  {
    id: "physics",
    emoji: "⚗️",
    name: "Physics Units",
    content: `distance = 150 m
time = 12 s
mass = 2.5 kg
gravity = 9.8 m/s^2

velocity = distance / time =>
force = mass * gravity =>
area = 10 m^2
pressure = force / area =>
work = force * distance =>

temp celsius = 25 °C
temp fahrenheit = temp celsius =>
temp kelvin = temp celsius =>`,
  },
  {
    id: "units-quick-check",
    emoji: "🧪",
    name: "Units Quick Check",
    content: `length = 10 m
width = 14 m
area = length * width =>
area =>

distance = 10 m
time = 20 s
speed = distance / time =>
speed =>
speed to km/h =>

mass = 3 kg
accel = 9.8 m/s^2
force = mass * accel =>
force to lbf =>

square = 3 m * 3 m =>
volume = 2 m * 2 m * 2 m =>

a = 1 m =>
b = 2 m =>
a + b =>

foo = bar * 2 =>
bar = 5
foo =>
3 m + 2 s =>
5 m / 0 s =>`,
  },
  {
    id: "stress-test",
    emoji: "🔥",
    name: "Highlight Stress Test",
    content: `base_value = 10
multiplier = 2
offset = 5

result1 = base_value * multiplier + offset =>
result2 = result1 * base_value - offset =>
result3 = result2 / multiplier + base_value =>
result4 = (result1 + result2 + result3) / offset =>

// References to base_value
ref1 = base_value * 1
ref2 = base_value * 2
ref3 = base_value * 3

// References to multiplier
ref4 = multiplier * 1
ref5 = multiplier * 2
ref6 = multiplier * 3

// References to offset
ref7 = offset + 1
ref8 = offset + 2
ref9 = offset + 3
`
  },
];

function TemplatePanel() {
  const { setSmartPadContent } = useEditorContext();

  const handleTemplateClick = (template: (typeof templates)[0]) => {
    setSmartPadContent(template.content);
    // Ensure evaluation runs after insertion
    try {
      window.dispatchEvent(new Event('forceEvaluation'));
    } catch {}
  };

  return (
    <aside className="template-panel">
      <h2 className="panel-title">Quick Templates</h2>
      <div className="template-buttons">
        {templates.map((template) => (
          <button
            key={template.id}
            className="template-button"
            onClick={() => handleTemplateClick(template)}
            title={template.name}
          >
            <span className="template-emoji">{template.emoji}</span>
            <span className="template-name">{template.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export default TemplatePanel;
