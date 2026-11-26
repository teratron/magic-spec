# Writing the neutral layer

A word list catches the words of a stack; these rows catch its concepts. A neutral unit that would use the left column writes the right one, and where a stack's own library would decide the matter (which letters fold, what ends a line), the neutral unit names the set and the stack layer chooses the means:

| Instead of | Write |
| --- | --- |
| a type known at run time, a generic resource, "the type's full name" | one per state type, keyed by that type; the stack layer adds an explicit key where types are erased |
| "fails the build", "does not compile" | is rejected at the earliest stage the stack offers, with a message that says why |
| an implementation limit ("a tuple of 1 to 15") | the need ("a group of several"); the limit lives in the binding |
| threads, processes, "in parallel", "once per process" | at the same time where the stack runs work concurrently; once in a run of the program |
| a pattern of values | a predicate over values |
| trait or interface names for capabilities ("equality, hashing, copying, debug printing") | the need: comparable for equality, usable as a key, cheap to copy, printable in logs |
| a mechanism of declaration ("derive", "marker", "annotation") | its effect: "a single declaration makes it a plain state" |
| closures with sharing bounds | function values |
| taking a part out of a container for a scope ("for the duration of a closure") | used in one operation together with the rest of the container |
| cloning ("it can be cloned") | the use the copy serves: "the same condition can gate several systems" |
| feature flags, configurations of a build tool | optional integrations, included by default or not (product items) |
| a dependency on a component only one stack has | nothing: that component is declared in the stack profile |
| "ignoring case", "case-insensitive", "a letter" | the exact characters that match regardless of case ("the letters A to Z and a to z"); every other character matches only itself |
| "a digit", "a number" read from text | the exact characters that count as digits ("0 to 9"); every other character is not a digit |
| "a word", "at a word boundary" | the characters that separate words, listed ("a space, a tab, the start or the end of the line") |
| "a newline", "the line ending of the machine", "the platform's line ending" | the characters that end a line, named for what is read and for what is written ("a line ends at a line feed, or at a carriage return followed by a line feed; every line written ends with a line feed") |
| "the text", "a string", for input read from outside the program | what counts as valid text (an encoding named by its standard) and what happens to input that is not valid text |
| "the runtime", "what the runtime offers", "the standard library" | what every stack provides by itself, named for the need ("reading a file, the local date of the machine, writing to the outputs") |
| "a date", "a day", "today" | the calendar and its range ("the Gregorian calendar extended backwards, years 1000 to 9999"), and where today's date comes from (the local date of the machine, or a date given as input) |

A neutral layer is reviewed across stacks before its first use on any stack: a reviewer who knows only another stack reads it and lists every concept that stack does not have, and each is rewritten by the table. A rewrite that names the mechanism it means to exclude ("whatever the usual line ending of the machine is") is the same leak and is rewritten again.

After each rewrite a fresh reader of the same stack reads the layer again; the review ends when a reading lists none of the leaks the readings before it listed, and after three rewrites a leak still listed stays as an `Open:` line on its unit.
