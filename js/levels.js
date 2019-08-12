// StackHack
// Laurence Scotford - 18th December 2014

// Show levels once the DOM is complete
$(document).ready(function() 
{
    levels.loadGame();
});

var levels = {
	levelData:[
		{
			cannon: false,
			time: 0,
			player: {x: 100, y:100, facingRight: true},
			guides: {
				"G0": {x: 750, y: 605, type: 12, dependencies:[]},
				"G1": {x: 800, y: 605, type: 12, dependencies:[]}
			},
			blocks: [
				{x: 40, y: 605, type: 0},
				{x: 500, y: 605, type: 1}
			],
			tutorial: [
				{x: 400, y: 250, width: 500, height: 180,
				 text: "The see-through blocks with the question marks are guides showing where the presents should be stacked.<br /><br />Hold down the right arrow key to move right and push the blue present into the first guide.",
				 trigger: function() {return game.remainingGuides < 2}},
				{x: 400, y: 250, width: 500, height: 180,
				 text: "Good work!<br /><br />You can't push the red present into the other guide, because there's no room for you to get behind the present. Instead you can carry it.<br /><br />Hold down the left arrow key to walk up to the red present and press the space key to pick it up.",
				 trigger: function() {return game.holdingBlock != null}},
				 {x: 400, y: 250, width: 500, height: 180,
				 text: "Awesome!<br /><br />Now carry it back and drop it on the second guide by pressing the space key again.<br /><br />To reach the second guide, you might need to use the up arrow key to jump.",
				 trigger: function() {return game.remainingGuides < 1}}
			]		
		}, 
		{
			cannon: false,
			time: 0,
			player: {x: 300, y:100, facingRight: true},
			guides: {
				"G0": {x: 750, y: 605, type: 12, dependencies:[]},
				"G1": {x: 800, y: 605, type: 12, dependencies:[]},
				"G2": {x: 775, y: 555, type: 0, dependencies:["G0","G1"]}
			},
			blocks: [
				{x: 120, y: 605, type: 1},
				{x: 125, y: 555, type: 0},
				{x: 120, y: 505, type: 2},
				{x: 500, y: 605, type: 3},
				{x: 525, y: 555, type: 0},
				{x: 50, y: 605, type: 0}
			],
			tutorial: [
				{x: 400, y: 250, width: 500, height: 180,
				 text: "When guides are stacked like this, you have to fill the lower guides before you can place presents in the upper guides<br /><br />First place presents in the lower two guides.",
				 trigger: function() {return game.remainingGuides < 2}},
				{x: 400, y: 250, width: 500, height: 180,
				 text: "Excellent!<br /><br />Guides with a question mark will accept any type of present. Other guides will only accept a present with matching paper.<br />The top guide wants a red present. Try dropping a different colour present there and you'll find it won't work.<br /><br />Now drop a red present on the guide to complete the level.",
				 trigger: function() {return game.remainingGuides < 1}},
			]		
		}, 
		{
			cannon: true,
			time: 0,
			frequencyMin: 3,
			frequencyMax: 6,
			player: {x: 100, y:100, facingRight: true},
			guides: {
				"G0": {x: 430, y: 605, type: 12, dependencies:[]},
				"G1": {x: 480, y: 605, type: 12, dependencies:[]},
				"G2": {x: 530, y: 605, type: 12, dependencies:[]},
				"G3": {x: 455, y: 555, type: 12, dependencies:["G0","G1"]},
				"G4": {x: 505, y: 555, type: 12, dependencies:["G1","G2"]}
			},			
			tutorial: [
				{x: 400, y: 250, width: 500, height: 100,
				 text: "In most levels you'll have to cope with the malfunctioning present stacking machine. Collect up the presents the machine is shooting out and use them to build the stack shown by the guides.",
				 trigger: function() {return game.remainingGuides < 1}},
			]
		}, 
		{
			cannon: true,
			time: 60,
			frequencyMin: 1,
			frequencyMax: 3,
			player: {x: 100, y:100, facingRight: true},
			guides: {
				"G0": {x: 430, y: 605, type: 12, dependencies:[]},
				"G1": {x: 480, y: 605, type: 12, dependencies:[]},
				"G2": {x: 530, y: 605, type: 12, dependencies:[]},
				"G3": {x: 455, y: 555, type: 6, dependencies:["G0","G1"]},
				"G4": {x: 505, y: 555, type: 8, dependencies:["G1","G2"]},
				"G5": {x: 480, y: 505, type: 10, dependencies:["G3","G4"]}
			},
			tutorial: [
				{x: 400, y: 250, width: 500, height: 100,
			 	 text: "Many levels are timed. The time remaining is shown in the top-right corner.<br /><br />Try to complete the stack within the time limit.",
				 trigger: function() {return (game.remainingGuides < 6) && (timer.elapsedTime() > 15)}},
			]
		},
		{
			cannon: true,
			time: 90,
			frequencyMin: 1,
			frequencyMax: 3,
			player: {x: 100, y:100, facingRight: true},
			platforms: [
				{x: 200, y: 200, width: 100},
				{x: 600, y: 450, width: 200}
				],
			guides: {
				"G0": {x: 510, y: 415, type: 0, dependencies:[]},
				"G1": {x: 510, y: 365, type: 2, dependencies:["G0"]},
				"G2": {x: 510, y: 315, type: 4, dependencies:["G1"]},
				"G3": {x: 510, y: 265, type: 6, dependencies:["G2"]}
			}
		}
	],
	
	// Shows the loading screen until the game is loaded, then shows the level select screen
	loadGame: function() {
		
		$('#return').click(function(){
				$('#gamecanvas').hide();
				$('#time').hide();
				$('#messagescreen').hide();
				levels.showLevels()
			});
		
		// load all the assets
		entities.init();
		
		// Wait until everything has loaded
		while(loader.loading());
		
		// Now show start button
		$('#loading').hide();
		$('#startgame').hide().show();
	},
	
	// Creates a table with buttons to launch each of the available levels
	showLevels: function() {
		
		// Now create the levels screen
		levelsHTML = "<tr>"
		for (var i=0; i < this.levelData.length; i++)
		{
			if(i != 0 && i % 5 == 0)
			{
				levelsHTML += "</tr><tr>";
			}
			
			levelsHTML += "<td class='present present" + i % 6 + "'><button onclick='game.initGame(levels.levelData[" + i + "]);'>" + (i + 1) + "</button></td>";
		}
		levelsHTML += "</tr>";
		$('#levels').html(levelsHTML);
		
		$('#titlescreen').hide();
		$('#levelselect').hide().show();		
	}
};