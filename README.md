# Quiet Rooms

A browser art piece made by Samantha White with Rheon (ChatGPT), inspired by the haunting encounters inside the moon in *Majora’s Mask*.

Explore four rooms containing masked figures, collected Claude Opus 5 text, books, ASCII inscriptions, and original room music. The passages were collected from conversations eliciting unusual, base-model-like text continuations. This describes the observed style, not verified access to a base model.

## Play locally

From this folder, run:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000/`. Use a local web server rather than opening `index.html` directly: the game loads JavaScript modules, text, and audio files.

## Controls

- Walk: WASD or arrow keys.
- Look: IJKL or drag the view.
- Interact / continue: E; Space also continues dialogue.
- Close dialogue: Escape.
- Music: M, or the Music button. Volume is available in Controls.
- Invert X/Y look: Controls.
- Touch: directional buttons to walk, drag to look, Talk to interact.

Music starts after entering the room and changes as you explore. The hallways remain open for revisiting rooms.

## Files and editing

The website is static HTML, CSS, and JavaScript. No build step, API key, or external music service is required. All resource paths are relative, so the game works under a GitHub project URL.

The JSON files hold the collected passages. Keep their exact wording and intended line breaks when editing. Textures and the four MP3 tracks are included. `tools/` contains the original music generators (Python, NumPy, SciPy, and ffmpeg); these are optional and are not needed to play or host the game.

Three.js is included locally; its license is in `THREE-LICENSE.txt`. The music is original synthesized composition and uses no *Majora’s Mask* recordings or melodies. This project is an independent art piece, unaffiliated with Nintendo or Anthropic.
