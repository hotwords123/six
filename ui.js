
let UI = (function() {

    var $container, $board;

    function boardClick(x, y) {
        if (game.state !== 'playing') return;
        var pos = renderer.toWorldPos(x, y);
        simulator.removeBrickAt(pos);
    }

    function init() {
        $container = $('.game-container');
        $board = $('#canvas');
        if (util.isMobileDevice()) {
            $board.on('touchstart', function(e) {
                if (e.touches.length === 1) {
                    var touch = e.touches[0];
                    boardClick(touch.clientX, touch.clientY);
                }
                e.preventDefault();
            });
        } else {
            $board.mousedown(function(e) {
                boardClick(e.offsetX, e.offsetY);
            });
        }
    }
    
    return {
        init,
        get $container() { return $container; }
    };

})();
