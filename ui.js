
let UI = (function() {

    var $board;

    function mouseDownHandler(e) {
        if (!game.started || game.paused) return;
        var pos = renderer.toWorldPos(e.offsetX, e.offsetY);
        simulator.removeBrickAt(pos);
    }

    function init(board) {
        $board = $(board);
        $board.mousedown(mouseDownHandler);
    }
    
    return {
        init
    };

})();
