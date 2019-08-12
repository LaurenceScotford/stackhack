// StackHack
// Laurence Scotford - 18th December 2014

// world.js - contains the logic to control the game world, using the Box2DWeb physics engine

// Declare all the commonly used Box2D objects as global variables for convenience
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2World = Box2D.Dynamics.b2World;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
var b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef;
var b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef;
var b2WeldJointDef = Box2D.Dynamics.Joints.b2WeldJointDef;
var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
var b2Static = b2Body.b2_staticBody;
var b2Dynamic = b2Body.b2_dynamicBody;

var world = {
	scale: 60,			// 60 pixels on the canvas = 1 metre in the game world
	
	//As per the Box2d manual, the suggested iteration count for Box2D is 8 for velocity and 3 for position.
	velocityIterations: 8,
	positionIterations: 3,
	
	// Initialise the physics world - set debug to true if debug drawing is required
	initWorld: function(debug, context)
	{
		// Set debug flag
		world.debug = debug;
		
		// Set up the Box2d world that will do most of the physics calculation
		var gravity = new b2Vec2(0,9.8); // Declare gravity as 9.8 m/s^2 downward
		var allowSleep = false; 			// Allow objects that are at rest to fall asleep and be excluded from calculations
		world.b2dworld = new b2World(gravity,allowSleep);	// Create a new physics world
			
		// Switch on debug drawing if required
		if (world.debug)
		{
			world.setupDebugDraw(context);
		}
	},
	
	// Makes Box2D draw shapes representing the physics bodies in the world
	setupDebugDraw: function(context)
	{
		var debugDraw = new b2DebugDraw();
	  
		// Use this canvas context for drawing the debugging screen
		debugDraw.SetSprite(context);
		// Set the scale
		debugDraw.SetDrawScale(world.scale);
		// Fill boxes with an alpha transparency of 0.3
		debugDraw.SetFillAlpha(0.3);
		// Draw lines with a thickness of 1
		debugDraw.SetLineThickness(1.0);
		// Display all shapes and joints
		debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
	  
		// Start using debug draw in our world
		world.b2dworld.SetDebugDraw(debugDraw);
	},
	
	// Create a body based on the descriptor passed through
	createBody: function(descriptor)
	{
		// First create the body and add it to the world
		var bodyDef = new b2BodyDef;
		bodyDef.type = descriptor.type;
		bodyDef.position.x = descriptor.xPos/world.scale;
		bodyDef.position.y = descriptor.yPos/world.scale;
		var newBody = world.b2dworld.CreateBody(bodyDef);
		
		if (typeof descriptor.fixedRotation !== 'undefined')
		{
			newBody.SetFixedRotation(descriptor.fixedRotation);
		}

		// Now add the required fixtures
		for (var i in descriptor.fixtures)
		{
			var fixtureDesc = descriptor.fixtures[i];	// Get a reference to the descriptor for the current fixture
			
			// Set requested parameters
			var fixtureDef = new b2FixtureDef;
			if (typeof fixtureDesc.density !== 'undefined')
			{
				fixtureDef.density = fixtureDesc.density;
			}
			if (typeof fixtureDesc.friction !== 'undefined')
			{
				fixtureDef.friction = fixtureDesc.friction;
			}
			if (typeof fixtureDesc.restitution !== 'undefined')
			{
				fixtureDef.restitution = fixtureDesc.restitution;
			}
			if (typeof fixtureDesc.sensor !== 'undefined')
			{
				fixtureDef.isSensor = fixtureDesc.sensor;
			}

			// Build the shape
			switch(fixtureDesc.shape)
			{
				case "rectangle":
					fixtureDef.shape = new b2PolygonShape;
					
					// If the fixture is offset from the centre of the body and/or rotated create as oriented box, otherwise create as box
					if (typeof fixtureDesc.xOffset !== 'undefined' && typeof fixtureDesc.yOffset !== 'undefined' && typeof fixtureDesc.angle !== 'undefined')
					{
						fixtureDef.shape.SetAsOrientedBox(fixtureDesc.xSize / world.scale, fixtureDesc.ySize / world.scale,
													new b2Vec2(fixtureDesc.xOffset / world.scale, fixtureDesc.yOffset / world.scale), fixtureDesc.angle);
					}
					else
					{
						fixtureDef.shape.SetAsBox(fixtureDesc.xSize / world.scale, fixtureDesc.ySize / world.scale);
					}
					break;
				case "circle":
					fixtureDef.shape = new b2CircleShape(fixtureDesc.radius / world.scale);
					
					// If the fixture is offset from the centre of the body and/or rotated create as oriented box, otherwise create as box
					if (typeof fixtureDesc.xOffset !== 'undefined' && typeof fixtureDesc.yOffset !== 'undefined')
					{
						fixtureDef.shape.SetLocalPosition(new b2Vec2(fixtureDesc.xOffset / world.scale, fixtureDesc.yOffset / world.scale));	
					}
					break;
				default:
					throw "Unsupported fixture shape"
			}
			
			// Create the fixture
			var fixture = newBody.CreateFixture(fixtureDef);
			
			// If there is any user data, set it now
			if (typeof fixtureDesc.userData !== 'undefined')
			{
				fixture.SetUserData(fixtureDesc.userData);
			}
		}
		
		// Return a reference to the created body
		return newBody;
	},
	
	// Destroys the given body
	destroyBody: function(bodyToDestroy)
	{
		world.b2dworld.DestroyBody(bodyToDestroy);
	},
	
	// Creates a joint between two bodies
	createJoint: function(descriptor)
	{
		var joint = null;
		
		switch(descriptor.type)
		{
			case "revolute":
				// Create a revolute joint
				var jointDef = new b2RevoluteJointDef;
				var jointCentre = new b2Vec2(descriptor.centreX / world.scale, descriptor.centreY / world.scale);
				jointDef.Initialize(descriptor.bodyA, descriptor.bodyB, jointCentre);
							
				// If a local anchor has been specified for the second body, set it
				if(typeof descriptor.localAnchorB !== 'undefined')
				{
					jointDef.localAnchor2 = descriptor.localAnchorB;
				}
				
				joint = world.b2dworld.CreateJoint(jointDef);
				
				// If limits have been specified, apply them
				if(typeof descriptor.lowerLimit !== 'undefined' && typeof descriptor.upperLimit !== 'undefined')
				{
					joint.SetLimits(descriptor.lowerLimit, descriptor.upperLimit);
					joint.EnableLimit(true);
				}
				
				break;
			case "distance":
				// Create a distance joint
				var jointDef = new b2DistanceJointDef;
				var anchor1 = new b2Vec2(descriptor.anchor1.x / world.scale, descriptor.anchor1.y / world.scale);
				var anchor2 = new b2Vec2(descriptor.anchor2.x / world.scale, descriptor.anchor2.y / world.scale);
				jointDef.Initialize(descriptor.bodyA, descriptor.bodyB, anchor1, anchor2);
				jointDef.length = descriptor.length / world.scale;
				joint = world.b2dworld.CreateJoint(jointDef);
				break;
			case "weld":
				// Create a weld joint
				var jointDef = new b2WeldJointDef;
				jointDef.bodyA = descriptor.bodyA;
				jointDef.bodyB = descriptor.bodyB;
     
				jointDef.localAnchorA = new b2Vec2(descriptor.anchor1.x / world.scale, descriptor.anchor1.y / world.scale);
				jointDef.localAnchorB = new b2Vec2(descriptor.anchor2.x / world.scale, descriptor.anchor2.y / world.scale);
				joint = world.b2dworld.CreateJoint(jointDef);
				break;
			default:
				throw "Unsupported joint type"
		}
		
		return joint;
	},
	
	// Destroys a joint
	destroyJoint: function(joint)
	{
		world.b2dworld.DestroyJoint(joint);
	},
	
	// Returns a body's current position and angle
	locateBody: function(bodyToLocate)
	{
		var position = bodyToLocate.GetPosition();
		var angleInRadians = bodyToLocate.GetAngle();
		return {x: position.x * world.scale, y: position.y * world.scale, angle: angleInRadians};
	},
	
	// Places a body at the specified position and angle
	placeBody: function(bodyToPlace, xPos, yPos, angle)
	{
		bodyToPlace.SetPositionAndAngle(new b2Vec2(xPos / world.scale, yPos / world.scale), angle);
	},
	
	// Rotates a body in place to the specified angle
	rotateBody: function(bodyToRotate, angle)
	{
		bodyToRotate.SetAngle(angle);	
	},
	
	// Registers a listener with the provided callback functions
	registerListener: function(descriptor)
	{
		switch(descriptor.type)
		{
			case "contact":
				var listener = new Box2D.Dynamics.b2ContactListener;
				
				if(typeof descriptor.begin !== 'undefined')
				{
					listener.BeginContact = descriptor.begin;
				}
				
				if(typeof descriptor.end !== 'undefined')
				{
					listener.EndContact = descriptor.end;
				}

				world.b2dworld.SetContactListener(listener);
				break;
			default:
				throw "Unsupported listener type";
		}

	},
	
	// Returns an object the references both fixtures involved in a collision
	getCollisionFixtures: function(contact)
	{
		return {fixtureA: contact.GetFixtureA(), fixtureB: contact.GetFixtureB()};
	},
	
	// Extracts and returns userData from a body or one of its fixtures. If fixtureToQuery is null, the userData is taken from the body, otherwise it's
	// taken from the fixture indexed in fixtureToQuery
	getUserData: function(bodyToQuery, fixtureToQuery)
	{
		if (fixtureToQuery == null)
		{
			return bodyToQuery.GetUserData();
		}
		else
		{
			return world.fixtureAtIndex(bodyToQuery, fixtureToQuery).GetUserData();
		}
	},
	
	// Updates the game world by the given time step
	step: function(timeStep)
	{
		world.b2dworld.Step(timeStep, world.velocityIterations, world.positionIterations);
		world.b2dworld.ClearForces();
	},
	
	// Apply an impulse of velocity (x,y) to a body. If combine is true, (x, y) is added to current velocity
	pushBody: function(bodyToPush, x, y, combine)
	{
		if (combine)
		{
			var currentVelocity = bodyToPush.GetLinearVelocity();
			x = (x == null ? x : x - currentVelocity.x);
			y = (y == null ? y : y - currentVelocity.y);
		}
		
		var bodyMass = bodyToPush.GetMass()
		var impulseX = (x == null ? 0 : bodyMass * x);
		var impulseY = (y == null ? 0 : bodyMass * y);
		bodyToPush.ApplyImpulse(new b2Vec2(impulseX,impulseY), bodyToPush.GetWorldCenter());
	},
	
	// Draws debug graphics if in debug mode
	drawDebugGraphics: function()
	{
		if (world.debug)
		{
			world.b2dworld.DrawDebugData();
		}
	},
	
	// Updates a body with the configuration data provided
	updateBody: function(bodyToUpdate, config)
	{
		if (typeof config.fixtures != 'undefined')
		{
			var fixture = bodyToUpdate.GetFixtureList();
			for(var i in config.fixtures)
			{
				var data = config.fixtures[i];
				
				if (typeof data.sensor != 'undefined')
				{
					fixture.SetSensor(data.sensor);
				}
				
				if (typeof data.userData != 'undefined')
				{
					fixture.SetUserData(data.userData);
				}
				
				if (typeof data.friction != 'undefined')
				{
					fixture.SetFriction(data.friction);
				}
				
				fixture = fixture.GetNext();
			}
		}
	},
	
	fixtureAtIndex: function(bodyToQuery, index)
	{
		var fixture = bodyToQuery.GetFixtureList();
		for (var i = 0; i < index; i++)
		{
			fixture = fixture.GetNext();
		}
		return fixture;
	}
};