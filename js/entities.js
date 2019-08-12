// StackHack
// Laurence Scotford - 29th December 2014

// entities.js contains the logic to control the entities within the game

var entities = {
	descriptors: {
		"floor": {
			type: b2Static, xPos: GAMEWIDTH / 2, yPos: GAMEHEIGHT,
			fixtures: [{density: 1.0, friction: 1.0, restitution: 0.2, xSize: GAMEWIDTH / 2, ySize: 10, shape: "rectangle"}]
		},
		"left wall": {
			type: b2Static, xPos: 0, yPos: GAMEHEIGHT / 2,
			fixtures: [{density: 1.0, friction: 0.0, restitution: 0.2, xSize: 10, ySize: GAMEHEIGHT / 2, shape: "rectangle"}]
		},
		"right wall": {
			type: b2Static, xPos: GAMEWIDTH, yPos: GAMEHEIGHT / 2,
			fixtures: [{density: 1.0, friction: 0.0, restitution: 0.2, xSize: 10, ySize: GAMEHEIGHT / 2, shape: "rectangle"}]
		},
		"platform": {
			type: b2Static, ySize: 10,
			fixtures: [{density: 1.0, friction: 1.0, restitution: 0.2, ySize: 10, shape: "rectangle"}],
			url: "images/platform.png", clipWidth: 1
		},
		"cannon" : {
			type: b2Static, xPos: GAMEWIDTH / 2, yPos: 0, xSize: 60, ySize: 95, xOffset: 0, yOffset: 35,
			fixtures: [
				{radius: 60, shape: "circle"},
				{xSize: 30, ySize: 40, xOffset: 0, yOffset: 90, angle: 0, shape:"rectangle"}
				],
				url: "images/Cannon.png"
		},
		"guide": {
			type: b2Static, xSize: 25, ySize: 25,
			fixtures: [{xSize: 25, ySize: 25, sensor: true, shape: "rectangle"}],
			url: "images/GuideSprites.png"
		},
		"block": {
			type: b2Dynamic, xSize: 25, ySize: 25,
			fixtures: [{density: 1.0, friction: 0.2, restitution: 0.3, xSize: 25, ySize: 25, shape: "rectangle"}],
			url: "images/BlockSprites.png"
		},
		"player": {
			type: b2Dynamic, fixedRotation: true, xSize: 50, ySize: 50,
			fixtures: [
				{density: 1.0, friction: 0.0, restitution: 0.3, xSize: 10, ySize: 45, xOffset:0, yOffset:-5, angle:0.0, shape: "rectangle"},
				{density: 1.0, friction: 0.1, restitution: 0.3, radius: 10, xOffset: 0, yOffset: 35, shape: "circle"},
				{friction: 0.0, xSize: 10, ySize: 6, xOffset:0, yOffset: 51, angle: 0.0, shape: "rectangle", sensor: true, userData: "F"}
			],
			url: "images/character.png"
		},
		"arm": {
			type: b2Dynamic, xSize: 4, ySize: 17,
			fixtures: [
				{density: 1.0, friction: 0.0, restitution: 0.3, xSize: 4, ySize: 17, angle:0.0, shape: "rectangle"},
			],
			url: "images/character_arms.png"
		}
	},
	
	// Load assets for all entities
	init: function()
	{
		for (var i in entities.descriptors)
		{
			if(typeof entities.descriptors[i].url != 'undefined')
			{
				loader.loadImage(entities.descriptors[i]);
			}
		}
	},
	
	// Creates the entity with the given name
	createEntity: function(name, supplement)
	{
		// Get base dsecriptor
		var descriptor = entities.descriptors[name];
		
		for (var property in supplement)
		{
			if (supplement[property] instanceof Array)
			{
				for(var i in supplement[property])
				{
					for(var subProp in supplement[property][i])
					{
						descriptor[property][i][subProp] = supplement[property][i][subProp];
					}
				}
			}
			else
			{
				descriptor[property] = supplement[property];
			}
		}
			
		return world.createBody(entities.descriptors[name]);		
	},
	
	// Destroys an entity
	destroyEntity: function(entity)
	{
		world.destroyBody(entity);
	},
	
	// Draw entity
	drawEntity: function(type, bodyToDraw, sprite, inverted, width, height)
	{
		game.context.save();
		
		var position = world.locateBody(bodyToDraw);
		
		// Move canvas to correct position
		game.context.translate(position.x, position.y);
		if(inverted)
		{
			// Flip the canvas if drawing a mirrored image
			game.context.scale(-1, 1);
		}
		// Rotate canvas to match rotation of entity
		game.context.rotate(position.angle);	
		
		// Get the spritesheet
		var img = entities.descriptors[type].image;
		
		// Calculate the clip size and clip the sheet to the correct sprite
		var clipX = sprite * entities.descriptors[type].xSize * 2;
		var clipY = 0;
		var clipWidth = (typeof entities.descriptors[type].clipWidth != 'undefined' ? 
						 entities.descriptors[type].clipWidth : entities.descriptors[type].xSize * 2);
		var clipHeight = (typeof entities.descriptors[type].clipHeight != 'undefined' ? 
						 entities.descriptors[type].clipHeight : entities.descriptors[type].ySize * 2);
		var width = (typeof width != 'undefined' ? width : entities.descriptors[type].xSize * 2);
		var height = (typeof height != 'undefined' ? height: entities.descriptors[type].ySize * 2);
		var xPos = -width / 2; 
		var yPos = -height / 2;
		
		// Apply a position offset, if there is one
		if (typeof entities.descriptors[type].xOffset != 'undefined' && typeof entities.descriptors[type].yOffset != 'undefined')
		{
			xPos += entities.descriptors[type].xOffset;
			yPos += entities.descriptors[type].yOffset;
		}

		// Draw the sprite
		game.context.drawImage(img,clipX,clipY,clipWidth,clipHeight,xPos,yPos,width,height);
		
//		if(type == "arm")
//		{
//			console.log(img + " " + clipX + " " + clipY + " " + clipWidth + " " + clipHeight + " " + xPos + " " + yPos + " " + width + " " + height);
//		}
		
		game.context.restore();
	}
};

var loader = {
	loadingCount: 0,		// Holds count of assets currently being loaded
	
	// loads the image at the given url
	loadImage: function(entity)
	{
		loader.loadingCount++;
		entity.image = document.createElement('img');
		entity.image.onload = loader.itemLoaded();
		entity.image.src = entity.url;
	},
	
	// updates the loading count when an image is loaded
	itemLoaded: function()
	{
		loader.loadingCount--;
	},
	
	// indicates if assets are still being loaded
	loading: function()
	{
		return loader.loadingCount > 0;
	}
};