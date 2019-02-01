
$(document).ready(function() {

    var $canvas = $('#canvas');
    var canvas = $canvas.get(0);
    
    simulator.init();

    renderer.setCanvas(canvas);
    renderer.loadOptions();
    renderer.setHeight(window.innerHeight, false);
    renderer.initRenderFn();

    $(window).resize(function() {
        renderer.setHeight(window.innerHeight, true);
    });

    UI.init($('#canvas'));

    game.newGame();

});
