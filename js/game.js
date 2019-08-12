// StackHack
// Laurence Scotford - 29th December 2014

// game.js contains the logic to control the game loop

// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel
(function() 
{
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) 
	{
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) 
		{
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) 
		{
            clearTimeout(id);
        };
}());

var game = {	
	// This function sets up the game world, ready for play
	initGame: function(currentLevel)
	{
		// Show game canvas
		$('#levelselect').hide();
		$('#gamecanvas').show();
		$('#time').show();
		
		game.level = currentLevel;	// Store current level data
		game.tutIndex = 0;		// Set the tutorial index to 0
		game.tutorial = false;	// Indicates if the tutorial window is currently showing
		$("#tutorial").html(" ");
		
		// Context for the drawing surface
		game.context = $("#gamecanvas")[0].getContext('2d');	
		
		// Set up a new physics world with debugging switched off
		world.initWorld(false, game.context);
			
		// Create the floor at the bottom of the play area and walls at the side
		game.createFloorAndWalls();
		
		// Create platforms
		game.createPlatforms();
		
		// Create the cannon
		game.createCannon();
		
		// Add the block guide for the level
		game.createBlockGuide();
		
		// Create empty blocks array, a blocktype count array and initialise uid seed
		game.blocks = {};
		game.blockCounts = [0, 0, 0, 0, 0, 0];
		uidSeed = 0;
		
		// Create initial blocks, if there are any
		game.createInitialBlocks();
	
		// Create a rectangular body that represents the player
		game.createPlayerBody();
		
		game.moving = game.MOVE_STOP;	// Indicates direction of player movement (MOVE_STOP, MOVE_LEFT, or MOVE_RIGHT)
		game.jumping = false;			// Indicates whether the player is currently jumping				
		game.jumpTimeout = 0;			// Holds a counter to delay activation of multiple jumps from a single key press
		game.manipulating = false;		// Indicates if player is currently manipulating (i.e. picking up) a block
		game.holdingBlock = null;		// Holds a reference to the block the player is currently holding (null if none)
		game.pendingGuides = [];			// Holds a list of references to guides the player is currently in contact with
		game.matchesToMake = [];			// A queue to hold matches to be made between blocks and guides
		
		
		// Set up input
		input.init();
					
		// Start listening for contact between bodies
		game.listenForContact();
		
		game.state = "running";	// Indicates the current game state
		
		// If the level is timed, start the timer
		if (game.level.time > 0)
		{
			timer.init(game.level.time * 1000, game.timedOut);
		}
				
		// Request initial animation frame to start animating the game world
		game.animationFrame = window.requestAnimationFrame(game.animate);
	},
	
	// Creates a rigid floor and walls to keep things contained within the play area
	createFloorAndWalls: function()
	{
		entities.createEntity("floor");
		entities.createEntity("left wall");
		entities.createEntity("right wall");	
	},
	
	// Create platforms (if any)
	createPlatforms: function()
	{	
		game.platforms = [];		// Holds references to the platforms in the level
		for (var i in game.level.platforms)
		{
			var supplement = {xPos: game.level.platforms[i].x, yPos: game.level.platforms[i].y, xSize: game.level.platforms[i].width, 
				fixtures:[{xSize: game.level.platforms[i].width}]};
			
			game.platforms[i] = entities.createEntity("platform", supplement);
		}
	},
	
	// Creates the cannon at the top of the screen
	createCannon: function()
	{
		game.cannon = entities.createEntity("cannon");
		game.nextFireAngle = 0.0;
		game.getTargetPositionAndTime(new Date());
	},
	
	// Sets up the guide that shows players where to place blocks
	createBlockGuide: function()
	{
		game.remainingGuides = 0;	// Number of guides remaining to be filled
		game.guides = {};			// Holds references to all the guides in the level
		
		// Now create all the guides in the level
		for(var i in game.level.guides)
		{
			var supplement = {xPos: game.level.guides[i].x, yPos: game.level.guides[i].y, fixtures: [{userData: i}]};

			var type = game.level.guides[i].type;
			game.guides[i] = {};
			game.guides[i].guideBody = entities.createEntity("guide", supplement, type);
			game.guides[i].type = type;
			game.remainingGuides++;
		}
	},
	
	// Create initial blocks if there are any
	createInitialBlocks: function()
	{
		if (typeof game.level.blocks != 'undefined')
		{
			for (var i in game.level.blocks)
			{
				game.createBlock(game.level.blocks[i], null);
			}
		}
	},
	
	// Creates a new block
	createBlock: function(descriptor, angle)
	{
		// Create a uid for this block
		var uid = "B" + uidSeed++;
		
		var x, y, blockType;	// Will be used to hold initial position of block and the blocktype
		
		if (descriptor != null)
		{
			x = descriptor.x;
			y = descriptor.y;
			blockType = descriptor.type;
		}
		else
		{
			// Generate a random block type and increment the count for that type
			// block choice is weighted towards blocks that have a lower current amount on screen
		
			// Find highest block count
			var highest = 0;
			for (var i = 0; i < 6; i++)
			{
				if (game.blockCounts[i] > highest)
				{
					highest = game.blockCounts[i];
				}
			}
		
			// Create an array to hold the block weights
			var blockWeights = [];
			var total = 0;
	
			// Now caculate the weighting for each block
			for (var i = 0; i < 6; i++)
			{
				blockWeights[i] = highest + 1 - game.blockCounts[i];
				total += blockWeights[i];
			}
	
			var randNum = Math.floor(Math.random() * 60);
			var countEnd = 0;
			for (blockType = 0; blockType < 6; blockType++)
			{
	
				countEnd += 60 * (blockWeights[blockType] / total);
					
				if (countEnd >= randNum)
				{
					break;
				}
			}
				
			// Calculate the position the block should be created at
			angle += Math.PI / 2;
			var x = GAMEWIDTH / 2 + 130 * Math.cos(angle);
			var y = 130 * Math.sin(angle);
		}
		
		// create the block at the required position
		var supplement = {xPos: x, yPos: y, fixtures: [{userData: uid}] };
		game.blocks[uid] = {blockBody: entities.createEntity("block", supplement), type: blockType};
		
		// Increment the count for that block type
		game.blockCounts[blockType]++;
		
		// Now give it a shove in the right direction, if it's a block that is being fired
		if (angle != null)
		{
			world.pushBody(game.blocks[uid].blockBody, (x - GAMEWIDTH / 2) / 10, (y - 0) / 10);
		}
	},
	
	// Creates a rectangular body to represent the player character
	createPlayerBody: function()
	{
		// Create the player character
		var supplement = {xPos: game.level.player.x, yPos: game.level.player.y};
		game.player = entities.createEntity("player", supplement);
		
		game.facingRight = game.level.player.facingRight;	// Indicates whether player is currently facing right (if false, player is facing left)
		
		// Adjust yposition for arms
		supplement.yPos -= 10;
		
		// Create the player character arms
		game.rearArm = entities.createEntity("arm", supplement);
		
		// Set up  a joint between the player character's body and the arm
		var playerPos = world.locateBody(game.player);
		var descriptor = {bodyA: game.player, bodyB: game.rearArm, centreX: playerPos.x, centreY: playerPos.y - 20, type: "revolute", 
						 localAnchorB: new b2Vec2(0, -12), lowerLimit: -(Math.PI * 0.5) , upperLimit: Math.PI * 0.5};
		game.frontArmJoint = world.createJoint(descriptor);
	
		game.frontArm = entities.createEntity("arm", supplement);
		
		// Set up  a joint between the player character's body and the arm
		descriptor.bodyB = game.frontArm;
		game.rearArmJoint = world.createJoint(descriptor);
	
		game.numFootContacts = 0;	// Used to keep track of the number of bodies the player's foot is touching
		
		game.lastSprite = 0;
		game.lastSpriteUpdate = new Date();
	},
	
	// Set the limits on arm joints depending on wether a block is currently being held
	setArmJointLimits: function()
	{
		if (game.holdingBlock)
		{

			if(game.facingRight)
			{
				game.frontArmJoint.SetLimits(0.0, Math.PI);
				game.rearArmJoint.SetLimits(0.0, Math.PI);
			}
			else
			{
				game.frontArmJoint.SetLimits(-Math.PI, 0.0);
				game.rearArmJoint.SetLimits(-Math.PI, 0.0);
			}
		}
		else
		{
			game.frontArmJoint.SetLimits(-(Math.PI * 0.5), Math.PI * 0.5);
			game.rearArmJoint.SetLimits(-(Math.PI * 0.5), Math.PI * 0.5);
		}
	},
	
	// Movement constants
	MOVE_LEFT: -1,
	MOVE_STOP: 0,
	MOVE_RIGHT: 1,

	guideContacts: [],	// Keeps track of number of guides in contact with the player's foot

	// Set up listeners to monitor foot contacts and guide blocks
	listenForContact: function()
	{
		world.registerListener(
			{
				type: "contact",
				begin:function(contact)
				{
					var collFixtures = world.getCollisionFixtures(contact);
					var codeA = world.getUserData(collFixtures.fixtureA);
					codeA = codeA ? codeA : " ";
					var codeB = world.getUserData(collFixtures.fixtureB);
					codeB = codeB ? codeB : " ";
					if (codeA == "F" || codeB == "F")
					{
						// If in contact with a guide record it, in case it changes to a completed guide while the player is in contact with it
						if (codeA.charAt(0) == "G" || codeB.charAt(0) == "G")
						{
							var guide = game.getCode("G", codeA, codeB);
							game.guideContacts.push(guide);
						}
						else
						{
							// Otherwise increase the number of contacts
							game.numFootContacts++;
						}
					} 
					else if ((codeA.charAt(0) == "G" || codeB.charAt(0) == "G") && (codeA.charAt(0) == "B" || codeB.charAt(0) == "B"))
					{
						// A block is in contact with a guide, so check it is not the block being carried
						var block = game.getCode("B", codeA, codeB);
						var guide = game.getCode("G", codeA, codeB);
						if (block == game.holdingBlock)
						{
							// Block is currently being held, so mark it as pending
							game.pendingGuides.push(guide);
						}
						else
						{
							// Next check if the guide's dependencies have been fulfilled
							game.attemptToPlaceBlock(block, guide)
						}
					}
				},
				end: function(contact)
				{
					var collFixtures = world.getCollisionFixtures(contact);
					var codeA = world.getUserData(collFixtures.fixtureA);
					codeA = codeA ? codeA : " ";
					var codeB = world.getUserData(collFixtures.fixtureB);
					codeB = codeB ? codeB : " ";
					if (codeA == "F" || codeB == "F") 
					{
						// If ending contact with a guide, remove it from the record
						if (codeA.charAt(0) == "G" || codeB.charAt(0) == "G")
						{
							var guide = game.getCode("G", codeA, codeB);
							game.removeGuideContact(guide);
						}
						else
						{
							// Otherwise decrement the bumber of foot contacts
							game.numFootContacts--;
						}
					}	
					
					// A block has ended contact with a guide, so check it's not in the pending list
					if (game.holdingBlock && (codeA.charAt(0) == "G" || codeB.charAt(0) == "G") && (codeA.charAt(0) == "B" || codeB.charAt(0) == "B"))
					{
						var block = game.getCode("B", codeA, codeB);
						if (block == game.holdingBlock)
						{
							var guide = game.getCode("G", codeA, codeB);
							var index = game.pendingGuides.indexOf(guide)
							if (index != -1)
							{
								game.pendingGuides.splice(index, 1);
							}
						}
					}
				}
			}
		);
	},
	
	// Given the codes from two contacts, finds which one matches the code letter and returns the relevant number
	getCode: function(codeLetter, codeA, codeB)
	{
		if(codeA.charAt(0) == codeLetter)
		{
			return codeA;
		}
		else
		{
			return codeB;
		}
	},
	
	// Attempt to place the given block in the given guide - the block will be placed if all the guides dependencies 
	// are fulfilled and block is of correct type
	attemptToPlaceBlock: function(block, guide)
	{
		// Check if block is of correct type
		if( game.guides[guide].type == 12 || (game.guides[guide].type == game.blocks[block].type * 2))
		{
			// Only place block if the guide is not already waiting to be used
			var alreadyMatched = false;
			for(var i in game.matchesToMake)
			{
				if (block == game.matchesToMake[i].block)
				{
					alreadyMatched = true;
					break;
				}
			}
			if (!alreadyMatched)
			{
				var dependenciesFulfilled = true;
				var dependencies = game.level.guides[guide].dependencies;
				for (var i = 0; i < dependencies.length; i++)
				{
					if (world.getUserData(game.guides[dependencies[i]].guideBody, 0) != "C")
					{
						dependenciesFulfilled = false;
						break;
					}
				}
				if (dependenciesFulfilled)
				{
					// Mark this as a match for processing once the current step is completed
					game.matchesToMake.push({"block": block, "guide": guide});
					return true
				}
			}
		}
		
		return false;
	},
	  
	lastDirection: 0,	// Used to check when we have just turned around, so that the correct sensor can be used
	 
	 // Animates a single frame in the game world 
	animate: function()
	{
		if (input.keyPressed(input.KEY_UP))
		{
			if (!game.jumping && game.numFootContacts > 0 && game.jumpTimeout == 0)
				{ 
					game.jumping = true;
					game.jumpTimeout = 15;	// Wait fifteen frames before allowing another jump
				}
		}
		if (input.keyPressed(input.KEY_RIGHT))
		{
			game.facingRight = true;
		
			if (game.lastDirection == game.MOVE_LEFT && game.holdingBlock !== null)
			{
				game.holdBlock(game.holdingBlock);
			}
			
			game.moving = game.MOVE_RIGHT;
			game.lastDirection = game.MOVE_RIGHT;
		}
		else if (input.keyPressed(input.KEY_LEFT))
		{
			game.facingRight = false;
	
			if (game.lastDirection == game.MOVE_RIGHT && game.holdingBlock !== null)
			{
				game.holdBlock(game.holdingBlock);
			}
			game.moving = game.MOVE_LEFT;
			game.lastDirection = game.MOVE_LEFT;
		}
		
		// Check if player trying to pick up or release block
		if (input.keyPressed(input.KEY_SPACE) && !game.manipulating)
		{
			game.manipulating = true;
			game.manipulateBlock();
		}
		else if(!input.keyPressed(input.KEY_SPACE))
		{
			game.manipulating = false;
		}

		// Reduce jump time out to indicate when jumping can next happen
		if (game.jumpTimeout > 0)
		{
			game.jumpTimeout--;
		}
		
		// Check if man is jumping, and if so, apply upwards impulse
		if(game.jumping)
		{
			game.jumping = false;
			if(game.holdingBlock)
			{
				world.pushBody(game.player, null, -15, false);
			}
			else
			{
				world.pushBody(game.player, null, -8, false);
			}
		}
		
		// Move the player
		switch (game.moving)
		{
		  case game.MOVE_LEFT:  desiredVelocity = -2; break;
		  case game.MOVE_STOP:  desiredVelocity =  0; break;
		  case game.MOVE_RIGHT: desiredVelocity =  2; break;
		}
		
		game.lastMove = game.moving;
		
		world.pushBody(game.player, desiredVelocity, null, true)
		
		// Stop movement if player is standing on something
		if(game.numFootContacts > 0)
		{
			game.moving = game.MOVE_STOP;
		}
		
		// Update all the bodies in the game world
		var currentTime = new Date().getTime();
		var timeStep;
		if (game.lastUpdateTime){
			timeStep = (currentTime - game.lastUpdateTime)/1000;
			if(timeStep >2/60)
			{
				timeStep = 2/60
			}
			world.step(timeStep);
		}
		game.lastUpdateTime = currentTime;		

		// Now make any pending matches between blocks and guides 
		game.makeMatches();
		
		// Control cannon if it is present in the level
		if (game.level.cannon)
		{
			game.controlCannon();
		}
		
		// Clear the canvas before drawing
		game.context.clearRect(0, 0, GAMEWIDTH, GAMEHEIGHT);
	
		// If debugging is on display all the bodies in the game world
		world.drawDebugGraphics();
		
		// Draw the platforms (if any)
		game.drawPlatforms();
		
		// Draw the player's rear arm - this arm is drawn seperately so it appears behind any carried block
		game.drawRearArm();
		
		// Draw all the blocks
		game.drawBlocks();
		
		// Draw the cannon
		game.drawCannon();
		
		// Display the completed guides
		game.drawGuides();
		
		// Display the player sprite
		game.drawPlayer();
		
		// Update the time display if the level has a timer
		if (game.level.time > 0)
		{
			var timeRemaining = game.level.time - timer.elapsedTime();
			var minutes = game.leadingZero(Math.floor(timeRemaining / 60));
			var seconds = game.leadingZero(timeRemaining - minutes * 60);
			$('#time').html(minutes + ":" + seconds);
		}
		
		// Show the tutorial, if there is one
		game.showTutorial();

		// Trigger next frame or end the level
		if (game.state != "running")
		{
			game.endGame();
		}
		else
		{
			game.animationFrame = window.requestAnimationFrame(game.animate);
		}
	},
	
	// Function to insert a leading zero to make a two digit number
	leadingZero: function(number)
	{
		return (number > 9 ? number : "0" + number);
	},

	blockJointFront: null,	// Used to reference the joint holding a carried block next to the player
	blockJointRear: null,

	// Processes key presses
	manipulateBlock: function()
	{
		if (game.holdingBlock != null)
		{
			var tempBlock = game.holdingBlock;	// Get a reference to the block we're about to release
			game.releaseBlock();
			
			// Check if there were any pending contacts with guides
			for (var i= 0; i < game.pendingGuides.length; i++)
			{
				// Try to place block with all the pending guides, but once we have a success, no need to check any further
				if (game.attemptToPlaceBlock(tempBlock, game.pendingGuides[i]))
				{
					break;
				}
			}
			
			game.pendingGuides = [];	// reset pending guides
		}
		else
		{
			// Find closest qualifying block
			var position = world.locateBody(game.player);
			var closest = null;
			for (var i in game.blocks)
			{
				var blockPosition = world.locateBody(game.blocks[i].blockBody);
	
				if((game.facingRight && blockPosition.x >= position.x + 25 && blockPosition.x <= position.x + 75) || 
				   (!game.facingRight && blockPosition.x <= position.x - 25 && blockPosition.x >= position.x - 75))
				{
					if(blockPosition.y >= position.y && blockPosition.y <= position.y + 100)
					{
						var xdist = position.x - blockPosition.x;
						var ydist = position.y - blockPosition.y;
						var blockDistance = Math.sqrt(xdist * xdist, ydist * ydist);
						if(!closest || blockDistance < closestDistance)
						{
							closest = i;
							closestDistance = blockDistance;
						}
					}
				}
			}
			
			// If a close enough block was found, grab it
			if(closest !== null)
			{
				game.holdBlock(closest);
			}
		}

	},
	
	// Moves the block to the correct side of the player character and makes a joint between the two
	holdBlock: function(blockRef)
	{
		// If a joint already exists, destroy it
		if (game.blockJointFront != null || game.blockJointRear != null)
		{
			game.releaseBlock();
		}
		
		game.setArmJointLimits();
		
		// Move the block being picked up so it is adjacent to the player character, and at a level angle
		var offset = (game.facingRight ? 50 : -50);
		var playerPos = world.locateBody(game.player);
		world.placeBody(game.blocks[blockRef].blockBody, playerPos.x + offset, playerPos.y, 0.0);
		var config = {fixtures:[{friction: 0}]};
		world.updateBody(game.blocks[blockRef].blockBody, config);
		
		// Set up joints between the player character's arms and the block that has been picked up
		var descriptor = {bodyA: game.frontArm, bodyB: game.blocks[blockRef].blockBody, anchor1: {x: 0, y: 0}, anchor2: {x: 0, y: -40}, type:"weld"}
		
		// Create the joint
		game.blockJointFront = world.createJoint(descriptor);
		
		var descriptor = {bodyA: game.rearArm, bodyB: game.blocks[blockRef].blockBody, anchor1: {x: 0, y: 0}, anchor2: {x: 0, y: -40}, type:"weld"}
		
		// Create the joint
		game.blockJointRear = world.createJoint(descriptor);
		
		// Reference the block being held
		game.holdingBlock = blockRef;
	},
	
	// Releases a held block
	releaseBlock: function()
	{
		world.destroyJoint(game.blockJointFront);
		world.destroyJoint(game.blockJointRear);
		if(game.holdingBlock)
		{
			var config = {fixtures:[{friction: 0.2}]};
			world.updateBody(game.blocks[game.holdingBlock].blockBody, config);
		}
		game.holdingBlock = null;
		game.blockJointFront = null;
		game.blockJointRear = null;
		game.setArmJointLimits()
	},

	// Make any pending matches between blocks and guides
	makeMatches: function()
	{
		for (var i = 0; i < game.matchesToMake.length; i++)
		{
			// Remove the block from the world
			var block = game.matchesToMake[i].block;
			entities.destroyEntity(game.blocks[block].blockBody);
			var blockType = game.blocks[block].type;
			game.blockCounts[blockType]--;
			delete game.blocks[block];
			
			// Make the guide solid
			var guide = game.matchesToMake[i].guide;
			game.guides[guide].type = blockType * 2 + 1;
			var config = {fixtures:[{sensor: false, userData: "C"}]};
			world.updateBody(game.guides[guide].guideBody, config)
			
			game.remainingGuides--;
			
			// Check if the guide was in contact with the player's foot and remove it from the list if so, and increment footcontacts
			if (game.removeGuideContact(guide))
			{
				game.numFootContacts++;
			}
		}
		
		// Reset list
		game.matchesToMake = [];
		
		// Check if all the guides have been matched, and if so, stop the game animation and show an end of game message
		if (game.remainingGuides == 0)
		{
			timer.stopTimer();
			game.state = "won";
		}
	},
	
	// Checks to see if the given guide is in the guide contacts list and removes it if so. Returns true if a guide was removed, or false otherwise
	removeGuideContact: function(guide)
	{
		var index = game.guideContacts.indexOf(guide);
		if (index != -1)
		{
			game.guideContacts.splice(index,1);
			return true;
		}
		else
		{
			return false;
		}
	},
	
	// Controls the cannon
	controlCannon: function()
	{
		var currentTime = new Date();
		var elapsedTime = currentTime - game.lastFired;
		
		// Check if it's time to fire the cannon
		if (game.nextFireTime && elapsedTime >= game.nextFireTime)
		{
			// Rotate the remaining distance to the target angle and then fire the block
			world.rotateBody(game.cannon, game.nextFireAngle);
			game.createBlock(null, game.nextFireAngle);
			game.getTargetPositionAndTime(currentTime);
		} 
		else
		{
			// Only move if elapsed time > half a second
			if (elapsedTime > 500)
			{
				// Check how far we've progressed towards the next fire time
				var progress = (elapsedTime - 500) / (game.nextFireTime - 500);
				
				// Calculate what angle we should have moved towards next fire time
				var newAngle = game.lastAngle + game.angleToMoveThrough * progress;
			
				// Rotate towards firing position
				world.rotateBody(game.cannon, newAngle);
			}
		}
	},
	
	// Gets a new target position and time for the cannon
	getTargetPositionAndTime: function(currentTime)
	{
		game.lastFired = currentTime;
		game.lastAngle = game.nextFireAngle;
		game.nextFireAngle = (Math.random() * Math.PI - Math.PI / 2.0);
		game.nextFireTime = (Math.random() * (game.level.frequencyMax - game.level.frequencyMin) + game.level.frequencyMin) * 1000 + 500;
		var angle1 = game.nextFireAngle - game.lastAngle;
		var angle2 = game.lastAngle - game.nextFireAngle;
		
		angle1 = (angle1 < 0 ? angle1 + 2 * Math.PI : angle1);
		angle2 = (angle2 < 0 ? angle2 + 2 * Math.PI : angle2);
		
		game.angleToMoveThrough = (angle1 < angle2 ? angle1 : angle2);
		
		game.angleToMoveThrough = (game.nextFireAngle < game.lastAngle ? -game.angleToMoveThrough : game.angleToMoveThrough);
	},
	
	// Draw platforms
	drawPlatforms: function()
	{
		for (var i in game.platforms)
		{
			entities.drawEntity("platform", game.platforms[i], 0, false, game.level.platforms[i].width * 2, 20);
		}
	},
	
	// Draw rear arm of player character
	drawRearArm: function()
	{
		// Draw the rear arm
		entities.drawEntity("arm", game.rearArm, 0);
	},
	
	// Draw blocks
	drawBlocks: function()
	{
		for (var i in game.blocks)
		{
			entities.drawEntity("block", game.blocks[i].blockBody, game.blocks[i].type);
		}
	},
	
	// Draw cannon
	drawCannon: function()
	{
		entities.drawEntity("cannon", game.cannon, 0);
	},
				
	// Draw guides
	drawGuides: function()
	{
		// Iterate through guides
		for (var i in game.guides)
		{
			entities.drawEntity("guide", game.guides[i].guideBody, game.guides[i].type);
		}
	},
	
	// Draws the player sprite on top of the body
	drawPlayer: function()
	{
			
		var sprite;
		var currentTime = new Date();
	
		// If player is jumping or falling use jumping sprite
		if (game.numFootContacts == 0)
		{
			sprite = 6;	
		}
		// Or if player is moving, cycle through walking sprites
		else if (game.lastMove != game.MOVE_STOP)
		{
			if (game.lastSprite > 3)
			{
				game.lastSprite = 0;
				game.lastSpriteUpdate = new Date();
			}
			sprite = game.lastSprite;
			if (currentTime - game.lastSpriteUpdate > 250)
			{
				game.lastSpriteUpdate = currentTime;
				if (++game.lastSprite > 3)
				{
					game.lastSprite = 0;
				}
			}
		}
		// Otherwise use standing sprite
		else
		{	
			sprite = 4;
		}

		// Now draw the sprite in position and at the relevant orientation
		entities.drawEntity("player", game.player, sprite, game.facingRight);	
			
		// Draw the front arm
		entities.drawEntity("arm", game.frontArm, 1);
			
	},
	
	// Show tutorial text, if there is any
	showTutorial: function()
	{
		// Only show the tutorial window if the level has a tutorial and there are still tutorial steps to show
		if ((typeof game.level.tutorial != 'undefined') && (game.tutIndex < game.level.tutorial.length))
		{
			// Get a reference to the current tutorial object
			var currentTut = game.level.tutorial[game.tutIndex];
			
			// Show the window if it is not currently showing, and display the tutorial message
			if (!game.tutorial)
			{
				$("#tutorial").css({top: currentTut.y, left: currentTut.x, width: currentTut.width, height: currentTut.height}); 
				$("#tutorial").hide().show("slow", function(){$("#tutorial").html(currentTut.text);});
				game.tutorial = true;
			}
			
			// If the current tutorial step's trigger has been met increment the tutorial index and show the next message if there is one
			if (currentTut.trigger())
			{
				if(++game.tutIndex < game.level.tutorial.length)
				{
					$("#tutorial").html(game.level.tutorial[game.tutIndex].text);
				}
			}
		}
		// Otherwise, if the window is still on, switch it off
		else if (game.tutorial)
		{
			$("#tutorial").html("");
			$("#tutorial").hide("slow");
			game.tutorial = false;
		}
	},
	
	// Shows the game ending screen
	endGame: function()
	{
		$("#tutorial").hide();
		var html = (game.state == "won" ? "Level complete" : "You're out of time");
		$('#message').html(html);
		$('#messagescreen').hide().show();
	},
	
	// Ends the level if the player is out of time
	timedOut: function()
	{
		game.state = "lost";
	}
};

var input = {
	// Keyboard constants
	KEY_LEFT: 37, 
	KEY_RIGHT: 39, 
	KEY_UP: 38,
	KEY_SPACE: 32,
	
	keyMap: [],	// An array to hold status of keys
	deBounceTimes: [],	// An array holding timecodes of last change, used for debouncing 
	
	// Set up keyboard input
	init: function()
	{
		// Set up a function to read the keyboard
		document.addEventListener("keydown", input.keyChange, false);
		document.addEventListener("keyup", input.keyChange, false);
	},
	
	// Function to respond to keypresses by recording the key currently pressed or released
	keyChange: function(e)
	{		
		// Record status of key being pressed or released
		input.keyMap[e.keyCode] = e.type == 'keydown';
	},
	
	// Returns status of queried key
	keyPressed: function(key)
	{
		return input.keyMap[key]
	}
};

var timer = {
	timeStarted: null,	// Used to hold the timestamp for when the timer started
	
	// Initialise timer to a given time in milliseconds
	init: function(time, callback)
	{
		timer.callback = callback;
		timer.timeStarted = new Date();
		timer.clock = setTimeout(timer.timedOut, time);
	},
	
	// Calls the callback function when the timer expires 
	timedOut: function()
	{
		timer.callback();
	},
	
	// Cancels the current timer
	stopTimer: function()
	{
		if (timer.clock != null)
		{
			clearTimeout(timer.clock);
			timer.clock = null;
		}
	},
	
	// Returns the current elapsed time in seconds
	elapsedTime: function()
	{
		return Math.floor((new Date() - timer.timeStarted) / 1000);
	}
};
















