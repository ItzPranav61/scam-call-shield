# REST TTS integration notes

The relay requests complete warning audio and validates it before emitting the
application's `warning.audio` message. Warning audio is cached by warning code,
language and voice. Mock mode generates a tone locally.

For provider request fields, voices, supported formats and error responses, consult
[Gnani's REST TTS guide](https://docs.gnani.ai/api/TTS/tts-inference).
The public copy does not redistribute the guide or its schema. Historical
prose/schema conflicts about required fields and speed strings remain UNVERIFIED;
consult current documentation rather than inferring support from these notes.
