# Super Splash Bros 2
![Super Splash Bros 2 logo](/app/img/icons/128x128.png)
### Welcome to the one and only successor of [Super Splash Bros](https://nm-games.eu/g/33), Super Splash Bros 2!

## What's changed?
Compared to Super Splash Bros, the following has been changed/improved:
- Super Splash Bros 2 is only playable as an app, while Super Splash Bros has to be played in a browser.
- Up to **8 players** are now able to join a single match! For this upgrade, the colors orange, cyan, purple and gray have been added.
- Collision detection has been changed: players now only feel a little bit of resistance when colliding, but can pass each other now at the same height.
- Added a local mode where players can connect up to 4 gamepads (e.g. PlayStation or XBox controllers) and fight on a single device.
- Percentages will **no longer kill players**: instead, a higher percentage means a player is easier pushed away by attacks. Percentages cannot exceed 500%.
- Added several power-ups in addition to shields (now known as *force fields*) and squashes. Power-ups can now be achieved from item boxes which look like fish.
- Player appearance is now customizable! Players can determine their own name, color and power-up.
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
- There is a chance that the game will not load on startup and show a white screen instead. Restarting the game solves that.
- Trying to access a LAN game by another method than typing in the usual host IP address, such as SSH tunneling, might result in crashing the game.

## Controls
|Action|Keyboard (default)|PlayStation|XBox|
|-----|-----|-----|-----|
|Move left|A|Left thumbstick|Left thumbstick|
|Move right|D|Left thumbstick|Left thumbstick|
|Jump|W|Cross|A|
|Attack|Space|R2|RT|
|Launch rocket|E|L2|LT|
|Activate power-up|Q|Square|X|
|Game menu|Escape (also in Local mode)|*N/A*|*N/A*|

## Game modes
Super Splash Bros 2 can be played in three different modes:
- **Local mode**  
  In Local mode, up to 4 players can compete against each other on a single device. This is done by using PlayStation or XBox controllers. The controls are mentioned above. The player colors are determined by the light bar color: blue, red, green and magenta. When (dis)connecting controllers, this can be messed up a bit, so move your left thumbstick to see which player you actually are.
- **LAN mode**  
  In LAN mode, up to 8 players can compete against each other on several devices connected to the same LAN (Local Area Network). If your device does not have any network connections, this mode is disabled. One player creates the game and becomes host of it, while other players join the game by using the local IP address of the host. The host has the ability to ban players, based on their local own IP address. The host also determines the theme and when the game starts.
- **Freeplay mode**  
  In Freeplay mode, one player competes against up to 7 dummies, although it is possible to play with less dummies or even alone. Freeplay mode is a great game mode to practice your skills in. The dummies can even show some behavior, based on the selected difficulty:
  - **None** means that the dummies will not do anything at all.
  - **Easy** will let the dummies randomly fire rockets, if they have at least one.
  - **Normal** increases the rocket fire probability, but only if the dummy is near the same Y level as the player. Dummies will also jump if they are in danger of falling into water, and move away from the outer platforms.
  - **Hard** increases the rocket fire probability even more if the dummy is near the same Y level as the player. Furthermore, dummies will always face the player, jump if they are in danger of getting hit by a rocket, and move further away from the outer platforms.
  - **CHAOS**: Starting from Easy difficulty, dummies will use their melee attack when *you* come close to them. Depending on the difficulty, the closer you get, the earlier they start attacking. But; the CHAOS difficulty does the same when dummies approach *each other*. Dummies will also jump and fire rockets at random, but still tend to stay away from the outer platforms. And, the finishing touch: everybody (including the player) receives a power-up at the start of the match, and every 30 seconds after!
    > **Note:** A beefy computer is recommended when playing on CHAOS difficulty, because of the many attacks, rockets and power-ups.

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
  - If a player lands on top of a rocket, the player will ride it! During a rocket ride, a player cannot move horizontally, so you can only get off by jumping or waiting. Most players prefer the first method!
- **Power-ups**  
  Power-ups are not always an attack method, but some of them are even more effective than rockets. More information about power-ups is documented below.

## I'm wet now, help!
Please remain calm!
- Players start with three lives, so you will respawn twice.
- Players respawn at the same location where they were at game start. If the water level has started to rise, players will spawn somewhere at the top platform.
- When respawning, players have 5 seconds of spawn protection. During this period, they cannot get knocked, take damage and lose lives.

## Fish
The fish is the new item box in Super Splash Bros 2. However, fish only give you your power-up.
- Players have to collide for about 0,9 seconds with a fish in order to get their power-up available.
- Fish spawn every 15 to 36 seconds, depending on how many players were in the lobby at game start.
- A fish spawn begins with the fish teleporting between the left and right sides of the water, and shortly after it will jump into the air.
- Fish remain in the air for 8 seconds. If the fish has not been fully claimed yet, it will fall down into the water again.
- Firing a rocket on a fish may result in some instant karma.

## Power-ups
More power-ups have been added in Super Splash Bros 2. Below are all currently available power-ups:
- **Squash**  
  Performing a squash will cause the player to move to the ground very fast. Once the player hits the ground, it will create a shockwave, moving other players out of the way. All players, including the performer, will take damage as well.
  - This power-up requires the player to be in the air, otherwise it will not activate.
  - [+] Other players get seriously damaged and pushed away from the performer.
  - [-] The performer will even get more damage from the fall.
  - [-] There is a small chance that the performer will phase through a platform, causing them to fall into water, wasting their squash.
- **Force Field**  
  Force fields protect the performer from enemy attacks. Force fields can be recognized by a black and white circle around a player. This power-up lasts for 10 seconds.
  - [+] Force fields protect players against any kind of damage, and they also prevent the knockback.
  - [+] Rockets bounce on force fields, and melee attack damage will be dealt to the attacker.
  - [-] Force fields do not protect players against falling into water, unlike spawn protection.
  - [-] Force fields significantly slow down players.
  - [-] Rockets fired by enemies inside your force field stay inside your force field, so do not let anyone come near you.
- **Invisibility**  
  Makes the performer invisible for all players! The performer itself will remain slightly visible on their own device. This power-up also lasts for 10 seconds.
  > In Local mode, the performer will become completely invisible because everyone plays on the same device. Be extra careful with your movements!
  - [+] No one can see you (coming), allowing you to greatly surprise your enemies.
  - [-] Off-screen indicators and projectiles fired by you will not become invisible.
- **Knockback**  
  When using regular attacks, the knockback will be tripled for 20 seconds.
  - [+] Significantly improves the basic attack, which is always available and has the shortest cooldown.
  - [-] Does not apply to rockets and other attacks.
- **Power Jump**  
  Power Jumps will multiply jump forces of the performer by 1,5 for 20 seconds.
  - [+] It makes dodging rockets easier.
  - [+] When hit by a rocket, you can get back to the play area easier.
  - [-] You have to be more patient before you are on the ground again.
- **Life Mender**  
  Restores one life upon activation, but you have a 20% chance for an extra life! Please note that the maximum life amount is 5.
  - This power-up requires the player to have less than 5 lives, otherwise it will not activate.
  - [+] Can be life saving.
  - [-] Not the most powerful power-up, compared to the next one.
- **Poop Bomb**  
  Activating this power-up will drop a poop bomb out of the back of the performer. The poop bomb will move towards the water. Once it hits the water, it will create a geyser that will push all players nearby it upwards, and damages them too. After the geyser disappeared, you still have a moment until all the victims are back on the platforms again.
  - [+] Great way to temporarily get rid of enemies, and to make them more vulnerable for a rocket hit.
  - [-] Requires some timing and aiming skills.
- **Exclusive Platform**  
  This power-up creates a special platform underneath the performer for 10 seconds. And only the performer can collide with it! Other players will fall right through it.
  - This power-up requires the player to be in the air, otherwise it will not activate.
  - [+] Enjoy the enemies trying to get you off, since the friction on exclusive platforms is higher.
  - [-] Exclusive platforms give no warning before they disappear.
- **Infinite Rockets**  
  This power-up does exactly what it says: it grants the performer an infinite amount of rockets for 5 seconds! Also, the rocket fire cooldown is reduced from 5 seconds to 0,25 seconds.
  - [+] Enemies have to be very cautious when someone is firing 20 times faster.
  - [-] You have to be careful around fish and force fields, because that is very dangerous for you.
  - [-] When the power-up ends, you have to regenerate your rockets from zero.

Be careful though:
- You will lose your power-up if you fall into water!
- After three minutes, the water level will start to rise, making it very difficult to reach the fish in the late game.

# Have fun!
