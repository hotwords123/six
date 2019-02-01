
let simulator = (function() {
    
    const
        b2Vec2 = Box2D.Common.Math.b2Vec2,
        b2AABB = Box2D.Collision.b2AABB,
        b2BodyDef = Box2D.Dynamics.b2BodyDef,
        b2Body = Box2D.Dynamics.b2Body,
        b2FixtureDef = Box2D.Dynamics.b2FixtureDef,
        b2Fixture = Box2D.Dynamics.b2Fixture,
        b2World = Box2D.Dynamics.b2World,
        b2MassData = Box2D.Collision.Shapes.b2MassData,
        b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape,
        b2CircleShape = Box2D.Collision.Shapes.b2CircleShape,
        b2DebugDraw = Box2D.Dynamics.b2DebugDraw,
        b2MouseJointDef =  Box2D.Dynamics.Joints.b2MouseJointDef;
    
    const tps = 60;
    
    var world;
    var options;
    var flatTop;
    var six, flat;
    var timer = null;

    /*
        {
            six: {
                sides: int,
                radius: float
            },
            brick: {
                size: float
            },
            flat: {
                width: float,
                height: float
            },
            cxBricks: int
        }
    */

    function Six(x, bottom, r, n) {

        var halfAngle = Math.PI / n;
        var eachAngle = 2 * halfAngle;
        var startAngle = n % 2 ? 0 : halfAngle;
        var sixY = bottom - r * Math.cos(halfAngle);

        var bodyDef = new b2BodyDef();
        bodyDef.type = b2Body.b2_dynamicBody;
        bodyDef.position.Set(x, sixY);

        var six = world.CreateBody(bodyDef);
        six.SetUserData({
            type: 'six'
        });

        var fixDef = new b2FixtureDef();
        fixDef.density     = 1.0;
        fixDef.friction    = 0.4;
        fixDef.restitution = 0.2;

        fixDef.shape = new b2PolygonShape();

        var vertices = new Box2D.NVector();
        for (let i = 0; i < n; ++i) {
            var angle = startAngle - i * eachAngle;
            var vx = r * Math.sin(angle);
            var vy = r * Math.cos(angle);
            vertices.push(new b2Vec2(vx, vy));
        }
        fixDef.shape.SetAsVector(vertices, n);

        six.CreateFixture(fixDef);

        return six;
    }

    function Brick(left, top, size, sub, data) {

        var halfSize = size / 2;
        var brickX = left + halfSize;
        var brickY = top + halfSize;

        var bodyDef = new b2BodyDef();
        bodyDef.type = b2Body.b2_dynamicBody;
        bodyDef.position.Set(brickX, brickY);

        var brick = world.CreateBody(bodyDef);
        var userData = Object.assign({ type: 'brick' }, data);
        brick.SetUserData(userData);

        var fixDef = new b2FixtureDef();
        fixDef.density     = 1.0;
        fixDef.friction    = 0.4;
        fixDef.restitution = 0.2;

        fixDef.shape = new b2PolygonShape();

        sub.forEach((data) => {
            var { x, y } = data;
            var vec = new b2Vec2(x * size, y * size);
            fixDef.shape.SetAsOrientedBox(halfSize, halfSize, vec, 0);
            var fix = brick.CreateFixture(fixDef);
            fix.SetUserData(data);
        });

        return brick;
    }

    function Flat(w, h) {

        var bodyDef = new b2BodyDef();
        bodyDef.type = b2Body.b2_staticBody;
        bodyDef.position.Set(0, 0);

        var flat = world.CreateBody(bodyDef);
        flat.SetUserData({
            type: 'flat'
        });
        
        var fixDef = new b2FixtureDef();
        fixDef.friction    = 0.4;
        fixDef.restitution = 0.2;
        
        fixDef.shape = new b2PolygonShape();
        fixDef.shape.SetAsBox(w / 2, h / 2);

        flat.CreateFixture(fixDef);

        return flat;
    }

    function init() {

        world = new b2World(new b2Vec2(0, 9.8), true);

    }

    function clearWorld() {
        var ground = world.GetGroundBody();
        var current = world.GetBodyList();
        while (current) {
            var next = current.GetNext();
            if (current !== ground) {
                world.DestroyBody(current);
            }
            current = next;
        }
        flatTop = null;
        six = null;
        flat = null;
    }

    function moveFlat(top) {
        var flatY = top + options.flat.height / 2;
        flat.SetPosition(new b2Vec2(0, flatY));
        flatTop = top;
    }

    function initWorld(sceneOptions) {
        
        clearWorld();

        options = sceneOptions;

        six = Six(0, 0, options.six.radius, options.six.sides);
        flat = Flat(options.flat.width, options.flat.height);

        moveFlat(0);
    }

    function addBricks(bricks, cyBricks) {

        var brickSize = options.brick.size;
        var halfSize = brickSize / 2;
        var leftBound = -options.cxBricks * halfSize;
        var topBound = flatTop;
        
        moveFlat(topBound + cyBricks * brickSize);

        bricks.forEach(({ x, y, sub, data }) => {
            var left = leftBound + x * brickSize;
            var top = topBound + y * brickSize;
            Brick(left, top, brickSize, sub, data);
        });
    }

    function getBrickAt(pos) {
        const eps = 1e-3;
        var vec = new b2Vec2(pos.x, pos.y);
        var aabb = new b2AABB();
        aabb.lowerBound.Set(pos.x - eps, pos.y - eps);
        aabb.upperBound.Set(pos.x + eps, pos.y + eps);
        var brick = null;
        world.QueryAABB((fix) => {
            var body = fix.GetBody();
            var data = body.GetUserData();
            if (!data || data.type !== 'brick') return true;
            if (!fix.GetShape().TestPoint(body.GetTransform(), vec)) return true;
            brick = body;
            return false;
        }, aabb);
        return brick;
    }

    function removeBrickAt(pos) {
        var brick = getBrickAt(pos);
        if (brick) {
            world.DestroyBody(brick);
        }
    }

    function updateWorld() {
        world.Step(1 / tps, 10, 10);
        var sixY = six.GetPosition().y;
        renderer.setCameraY(sixY, false);
        renderer.render();
    }

    function start() {
        if (timer !== null) return;
        timer = setInterval(updateWorld, 1000 / tps);
    }

    function stop() {
        if (timer === null) return;
        clearInterval(timer);
    }

    return {
        init,
        clearWorld, initWorld,
        addBricks, removeBrickAt,
        start, stop,
        get world() { return world; }
    };

})();
