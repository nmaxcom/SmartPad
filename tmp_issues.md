# Examples of wrongly parsed/interpreted/rendered expressions:

## 1
base price = $120.50
discount = 15%
final price = discount off base price

## Last line should be
variable operator variable operator variable

## But it's rendered as
<p><span class="semantic-variable">total</span> <span class="semantic-operator">=</span> <span class="semantic-unit">tax</span>_<span class="semantic-unit">rate</span> <span class="semantic-unit">on</span> <span class="semantic-unit">final</span> <span class="semantic-unit">price</span> <span class="semantic-trigger">=&gt;</span><span class="semantic-wrapper ProseMirror-widget" contenteditable="false"> <span class="semantic-result-container"><span class="semantic-result-display" data-result="$110.62" title="$110.62" aria-label="$110.62"></span></span></span><img class="ProseMirror-separator" alt=""><br class="ProseMirror-trailingBreak"></p>

## 2
pa_s=2
po=pa_s*2

## Last line should be
variable operator variable operator scrubbableNumber

## But it's rendered as
<p><span class="semantic-variable">po</span><span class="semantic-operator">=</span><span class="semantic-unit">pa</span>_<span class="semantic-unit">s</span><span class="semantic-operator">*</span><span class="semantic-variable">2</span></p>