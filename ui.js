
let UI = (function() {

    var $container, $board;

    function init() {
        $container = $('.game-container');
        $board = $('#canvas');
        if (util.isMobileDevice()) {
            $board.on('touchstart', function(e) {
                if (e.touches.length === 1) {
                    var touch = e.touches[0];
                    game.click(touch.clientX, touch.clientY);
                }
                e.preventDefault();
            });
        } else {
            $board.mousedown(function(e) {
                game.click(e.offsetX, e.offsetY);
            });
        }
    }
    
    return {
        init,
        get $container() { return $container; }
    };

})();
