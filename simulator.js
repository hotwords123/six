
let simulator = (function() {
    
    const
        b2Vec2 = Box2D.Common.Math.b2Vec2,
        b2AABB = Box2D.Collision.b2AABB,
        b2BodyDef = Box2D.Dynamics.b2BodyDef,
        b2Body = Box2D.Dynamics.b2Body,
        b2FixtureDef = Box2D.Dynamics.b2FixtureDef,
        b2World = Box2D.Dynamics.b2World,
        b2ContactListener = Box2D.Dynamics.b2ContactListener,
        b2WorldManifold = Box2D.Collision.b2WorldManifold,
        b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
    
    const tps = 60;
    
    var world;
    var contactListener;
    var options;
    var brickBuffer;
    var flatTop;
    var minFallY, maxFallY;
    var six, flat;
    var timer = null;

    var audioCtx = new AudioContext();
    var perfInfo = {
        time: {
            total: 0,
            simulate: 0,
            render: 0
        }
    };

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
        fixDef.restitution = 0.1;

        fixDef.shape = new b2PolygonShape();

        var vertices = new Box2D.NVector();
        for (let i = 0; i < n; ++i) {
            var angle = startAngle - i * eachAngle;
            var vx = -r * Math.sin(angle);
            var vy = -r * Math.cos(angle);
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
        fixDef.restitution = 0.1;

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
        fixDef.restitution = 0.1;
        
        fixDef.shape = new b2PolygonShape();
        fixDef.shape.SetAsBox(w / 2, h / 2);

        flat.CreateFixture(fixDef);

        return flat;
    }

    function init() {

        world = new b2World(new b2Vec2(0, 9.8), true);

        contactListener = new b2ContactListener();
        contactListener.BeginContact = onBeginContact;
        contactListener.EndContact = onEndContact;
        contactListener.PreSolve = onPreSolve;
        contactListener.PostSolve = onPostSolve;

        world.SetContactListener(contactListener);
    }

    function getColorOf(data) {
        switch (data.type) {
            case 'six':
                return 'hsl(210, 80%, 70%)';
            case 'brick':
                return data.color.border;
            case 'flat':
                return '#666';
            default:
                return null;
        }
    }

    function onBeginContact(contact) {
        //
    }

    function onEndContact(contact) {
        //
    }

    function onPreSolve(contact, oldManifold) {
        //
    }

    function onPostSolve(contact, impulse) {
        var fixA = contact.GetFixtureA();
        var fixB = contact.GetFixtureB();
        var bodyA = fixA.GetBody();
        var bodyB = fixB.GetBody();
        var dataA = bodyA.GetUserData();
        var dataB = bodyB.GetUserData();

        if (!dataA || !dataB) return;

        var typeA = dataA.type;
        var typeB = dataB.type;
        if (!typeA || !typeB) return;

        var sixData, otherData;
        if (typeA === 'six') {
            sixData = dataA;
            otherData = dataB;
        } else if (typeB === 'six') {
            sixData = dataB;
            otherData = dataA;
        } else return;

        var cntPoints = contact.GetManifold().m_pointCount;
        var manifold = new b2WorldManifold();
        contact.GetWorldManifold(manifold);

        for (let i = 0; i < cntPoints; ++i) {
            var point = manifold.m_points[i];

            var normalI = impulse.normalImpulses[i];
            var tangentI = Math.abs(impulse.tangentImpulses[i]);
            var power = 0;
            var color = null;

            if (normalI > 30) {
                power = Math.min(6, Math.pow(normalI, 0.6) / 5);
                color = getColorOf(sixData);
            } else if (tangentI > 5) {
                power = Math.min(5, Math.pow(tangentI, 0.8) / 3);
                color = getColorOf(otherData);
            } else return;

            var maxOffset = power / 25 * options.brick.size;
            var maxSpeed = power / 10 * options.brick.size;
            var cnt = util.randInt(1, power * 2);

            while (cnt--) {
                var posAngle = Math.random() * (2 * Math.PI);
                var speedAngle = Math.random() * (2 * Math.PI);
                var offset = Math.random() * maxOffset;
                var speed = Math.random() * maxSpeed;

                renderer.addParticle({
                    pos: {
                        x: point.x + offset * Math.cos(posAngle),
                        y: point.y + offset * Math.sin(posAngle)
                    },
                    velocity: {
                        x: speed * Math.cos(speedAngle),
                        y: speed * Math.sin(speedAngle)
                    },
                    angle: Math.random() * (2 * Math.PI),
                    size: util.randInt(3, 5) / 20 * options.brick.size,
                    color: color
                });
            }
        }
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
        brickBuffer = [];
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
        renderer.setCameraY(0);
    }

    function appendBricksToWorld(bricks, cyBricks) {

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
    
    function getMinFlatTop() {
        return renderer.getCameraY() + 0.55 * renderer.getCameraSize().height;
    }

    function checkBrickBuffer() {
        var minFlatTop = getMinFlatTop();
        while (brickBuffer.length && flatTop < minFlatTop) {
            var pile = brickBuffer.shift();
            appendBricksToWorld(pile.bricks, pile.cyBricks);
        }
    }

    function addBricks(bricks, cyBricks) {
        brickBuffer.push({ bricks, cyBricks });
        checkBrickBuffer();
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

    function removeBrickAt(pos, callback) {
        var brick = getBrickAt(pos);
        if (brick) {
            callback(brick);
            world.DestroyBody(brick);
        }
    }

    function updateWorld() {

        var time0 = audioCtx.currentTime;

        world.Step(1 / tps, 10, 10);

        var sixPos = six.GetPosition();

        var maxOffsetX = options.cxBricks * options.brick.size / 2 + options.six.radius;
        if (game.state !== 'ended' && Math.abs(sixPos.x) > maxOffsetX) {
            minFallY = sixPos.y;
            maxFallY = minFallY + renderer.getCameraSize().height / 2;
            game.gameOver();
        }
        
        checkBrickBuffer();

        if (game.attr.endless) {
            var minFlatTop = getMinFlatTop();
            if (flatTop < minFlatTop) {
                var cyMin = Math.ceil((minFlatTop - flatTop) / options.brick.size);
                game.requireBricks(cyMin);
            }
        } else {
            if (game.state !== 'ended' && six.GetLinearVelocity().Length() < 0.001) {
                var halfAngle = Math.PI / options.six.sides;
                var sixBottom = sixPos.y + options.six.radius * Math.cos(halfAngle);
                if (Math.abs(sixBottom - flatTop) < 0.1) {
                    game.gameWin();
                }
            }
        }

        if (['playing', 'paused'].includes(game.state)) {
            renderer.setCameraY(sixPos.y);
        } else {
            var k = Math.sin(Math.atan((sixPos.y - minFallY) / (maxFallY - minFallY)));
            renderer.setCameraY(minFallY + k * (maxFallY - minFallY));
        }

        var time1 = audioCtx.currentTime;

        renderer.render();

        var time2 = audioCtx.currentTime;

        perfInfo.time.simulate += time1 - time0;
        perfInfo.time.render += time2 - time1;
        perfInfo.time.total += time2 - time0;
    }

    function getPerformanceInfo() {
        return perfInfo;
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
        getPerformanceInfo,
        start, stop,
        get world() { return world; }
    };

})();
