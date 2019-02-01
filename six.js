
$(document).ready(function() {

    var $canvas = $('#canvas');
    var canvas = $canvas.get(0);
    
    simulator.init();

    renderer.setCanvas(canvas);
    renderer.loadOptions();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.initRenderFn();

    window.addEventListener('resize', function() {
        renderer.setSize(window.innerWidth, window.innerHeight, true);
    }, false);

    UI.init();

    game.newGame();

});
