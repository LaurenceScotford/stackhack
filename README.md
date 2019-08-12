# Stackhack
## Prototype for a 2D physics game
This is a Christmas game prototype I created as a final project for the CS50 online course from Harvard University / edX. I wanted to create something that would help me learn how to construct a 2D physics game.

After completing the project, I decided that the core gameplay idea wasn't strong enough to develop further.

The prototype consists of 5 demo levels - enough to introduce the player to each of the key game mechanics.

### Game story
The present stacking machine at Santa's workshop has broken down and is throwing out presents haphazardly. It is up to the player, as Santa's chief elf, to collect and stack presents in the required pattern.

### Game controls
The game is played using the keyboard:
- Left arrow: Move Left
- Right arrow: Move Right
- Up arrow: Jump
- Spacebar: Pick up / drop a present

### Features
- 2D physics-based game
- Progressive tutorial system triggered by player actions
- Timed or untimed levels
- Simple JavaScript object structure for level and tutorial data

### Development notes and dependencies
The game makes use of HTML canvas. It uses the following frameworks:

- [JQuery 2.4.4](https://jquery.com) for DOM manipulation
- [Box2DWeb 2.1.0](https://github.com/hecht-software/box2dweb) for 2D physics functions

These are both loaded via CDNs.

Other than those frameworks, the game is standard ES5 JavaScript.

All code (other than dependencies cited above) and graphics are by me, Laurence Scotford.
