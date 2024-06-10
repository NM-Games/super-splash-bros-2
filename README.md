# Super Splash Bros 2
![Super Splash Bros 2 logo](/app/img/icons/128x128.png)
### Welcome to the one and only successor of [Super Splash Bros](https://nm-games.eu/g/33), Super Splash Bros 2!

## What's changed?
Compared to Super Splash Bros, the following has been changed/improved:
- Super Splash Bros 2 is only playable as an app, while Super Splash Bros has to be played in a browser.
- Up to **8 players** are now able to join a single match! For this upgrade, the colors orange, cyan, purple and gray have been added.
- Collision detection has been changed: players now only feel a little bit of resistance when colliding, but can pass each other now at the same height.
- Added a local mode where players can connect up to 4 gamepads (e.g. PlayStation or XBox controllers) and fight on a single device.
- Percentages will **no longer kill players**: instead, a higher percentage means a player is easier pushed away by attacks.
- Added several superpowers in addition to shields and squashes. Superpowers can now be achieved from item boxes which look like fish.
- Player appearance is now customizable! Players can determine their own name, color and superpower.
- Added the option to remove dummies in Freeplay mode.
- Added a synthwave theme!
- Added music and sound effects! If you want, you can turn these off in the Settings menu and in the in-game menu.
- Keybinds can be remapped! Only for keyboards, not for gamepads, maybe later :)
- If you press the right buttons in the right order, something festive might happen on menu screens...
- And **MUCH more**! So read on!

## Installing
To install Super Splash Bros 2, go to the [Releases](https://github.com/NM-Games/super-splash-bros-2/releases) page.  
Over there, you can easily download the game for your operating system, and follow the instructions of the setup dialog.
> Hint for Linux users: be sure to choose the right architecture as well!
> Common PCs and laptops often require the x64 build, microcontrollers like Raspberry Pi and Odroid mostly require the arm64 build.
### macOS users
Mac users have to sign the app themselves by running `sudo codesign --force --deep --sign - /Applications/Super Splash Bros 2.app`.  
If that does not work, try building the app yourself by running `npm install && npm run build-mac`, assuming that npm is installed.

## Known issues
- Trying to access a LAN game by another method than typing in the usual host IP address, such as SSH tunneling, might result in crashing the game.

## Controls
|Action|Keyboard (default)|PlayStation|XBox|
|-----|-----|-----|-----|
|Move left|A|Left thumbstick|Left thumbstick|
|Move right|D|Left thumbstick|Left thumbstick|
|Jump|W|Cross|A|
|Attack|Space|R2|RT|
|Launch rocket|E|L2|LT|
|Activate superpower|Q|Square|X|
|Game menu|Escape (also in Local mode)|*N/A*|*N/A*|

## Attack methods
Your goal is to be the last player standing. But all other players will not voluntarily take a dip. So, how are you going to take everyone else out?
- **Melee attack**  
  The basic attack strategy, which is always available.
  - Using a melee attack will create an attack wave.
  - Shortly after the wave started, nearby players get 2%-5% damage.
  - This attack method has a 0,5 second cooldown.
- **Rockets**  
  Rockets are more effective than melee attacks, but:
  - Rockets can no longer be received from item boxes. Instead, they automatically regenerate every 20 seconds.
  - Players can hold up to 6 rockets at a time.
  - Rockets do 30%-50% damage to the player who got hit by it.
  - Rockets have a 5 second cooldown.
  - If a player lands on top of a rocket, the player will ride it! During a rocket ride, a player cannot move horizontally, so the only ways to get off a rocket is by jumping or waiting. You likely prefer the first method!
- **Superpowers**  
  Superpowers are not always an attack method, but some of them are even more effective than rockets. More information about superpowers is documented below.

## I'm wet now, help!
Please remain calm!
- Players start with three lives, so you will respawn twice.
- Players respawn at the same location where they were at game start. If the water level has started to rise, players will spawn somewhere at the top platform.
- When respawning, players have 5 seconds of spawn protection. During this period, they cannot take damage or lose lives.

## Fish
The fish is the new item box in Super Splash Bros 2. However, fish only give you your superpower.
- Players have to collide for about 2 seconds with a fish in order to get their superpower available.
- Fish spawn every 15 to 36 seconds, depending on how many players were in the lobby at game start.
- A fish spawn begins with the fish teleporting between the left and right sides of the water, and shortly after it will jump into the air.
- Fish remain in the air for 8 seconds. If the fish has not been fully claimed yet, it will fall down into the water again.
- Firing a rocket on a fish may result in some instant karma.

## Superpowers
More superpowers have been added in Super Splash Bros 2. Below are all currently available superpowers:
- **Squash**  
  Performing a squash will cause the player to move to the ground very fast. Once the player hits the ground, it will create a shockwave, moving other players out of the way. All players, including the performer, will take damage as well.
  - [+] Other players get seriously damaged and pushed away from the performer.
  - [-] The performer will even get more damage from the fall.
  - [-] There is a small chance that the performer will phase through a platform, causing them to fall into water, wasting their squash.
- **Shield**  
  Shields protect the performer from enemy attacks. Shields can be recognized by a black and white circle around a player.
  - [+] Shields protect players against any kind of damage, and they also prevent the knockback.
  - [-] Shields do not protect players against falling into water, unlike spawn protection.
  - [-] Shields significantly slow down players.
- **Invisibility**  
  Makes the performer invisible for all players! The performer itself will remain slightly visible on their own device.
  > In Local mode, the performer will become completely invisible because everyone plays on the same device. Be extra careful with your movements!
  - [+] No one can see you (coming).
  - [-] Other projectiles fired by you will not become invisible.
- **Knockback**  
  When using regular attacks, the knockback will be tripled.
  - [+] Significantly improves the basic attack, which is always available and has the shortest cooldown.
  - [-] Does not apply to rockets and other attacks.
- **Power Jump**  
  Power Jumps will multiply jump forces of the performer by 1,5.
  - [+] It makes dodging rockets easier.
  - [-] You have to be more patient before you are on the ground again.
- **Life Mender**  
  Restores a life upon activation.
  - [+] Can be life saving.
  - [-] Not the most powerful superpower, compared to the next one.
- **Poop Bomb**  
  Activating this superpower will drop a poop bomb out of the back of the performer. The poop bomb will move towards the water. Once it hits the water, it will create a geyser that will push all players nearby it upwards, and damages them too. After the geyser disappeared, you still have a moment until all the victims are back on the platforms again.
  - [+] Great way to temporarily get rid of enemies.
  - [-] Requires some timing and aiming skills.
- **Exclusive Platform**  
  This superpower creates a special platform underneath the performer. And only the performer can collide with it! Other players will fall right through it.
  - [+] Enjoy the enemies trying to get you off, since the friction on exclusive platforms is higher.
  - [-] Exclusive platforms give no warning before they disappear.

Be careful though:
- You will lose your superpower if you fall into water!
- After three minutes, the water level will start to rise, making it very difficult to reach the fish in the late game.

# Have fun!
