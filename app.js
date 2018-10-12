const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const mysql = require('mysql');

const port = 8080;
var board = [];
var cnt = 0;

// connect to the database with a pool for effeciency
var pool = mysql.createPool({
    connectionLimit: process.env.MYSQL_CONNECT_LIMIT,
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    port: process.env.MYSQL_PORT,
    database: process.env.MYSQL_DB,
    supportBigNumbers: true
});
// console.log("env vars", process.env, process.env.MYSQL_HOST, process.env.MYSQL_CONNECT_LIMIT, process.env.MYSQL_USER)
// console.log("POOL", pool);

app.get('*', function(req, res) {
    // req.url
    res.sendFile(path.join(__dirname + '/public/index.html'))
});

io.on('connection', function(socket) {



    console.log('user connected--------------------------------', socket.handshake.headers.referer, socket.id);
    //http://paperjs.org/reference/pathitem/#datas
    let re = new RegExp(/\/boards\/([a-zA-Z0-9]+)/);

    // result[1] should be the part after http://url/boards/<this_part>
    let result = socket.handshake.query.room.match(re);
    if (result == null) {
        console.log("no match on register");
        return;
    }

    let thisBoard = result[1];

    console.log("thisBoard", thisBoard);


    // we have a specifc board, subscribe the user to the room
    socket.join(thisBoard, function() {
        console.log("in thisBoard", thisBoard)
        console.log("socket is in rooms", socket.rooms);

        // get a connection to the DB and see if the board exists
        pool.getConnection(function(err, connection) {
            if (err) throw err; // not connected!

            // INSERT UNLESS KEY EXIST:
            // Use the connection
            connection.query("SELECT * from boards WHERE NAME = " + mysql.escape(thisBoard), function(error, results, fields) {

                // check for error
                if (error) throw error;

                // no results, insert the board into the DB
                if (results.length == 0) {
                    connection.query("INSERT INTO boards (name, owner) VALUES (" + mysql.escape(thisBoard) + ", " + mysql.escape(socket.id) + ")", function(error, results, fields) {
                        if (error) throw error;

                        console.log("SQL INSERT RESULT?", results);

                        // all done, release this connection  
                        connection.release();

                        // tell myself the current state of the room from the server
                        socket.emit('log', "joined on insert " + thisBoard);
                    });
                } else {
                    // the board did exist, got the results
                    console.log("SQL QUERY RESULT?", results);
                    connection.release();

                    // tell myself the current state of the room from the server
                    socket.emit('log', "joined on query " + thisBoard);
                }
            });
        });
    });


    socket.on('disconnect', function() {
        // users are automatically removed from the room when they disconnect
        console.log('user disconnected');

        // close DB connection

    });
    // serialize?
    socket.on('startDraw', function(path, cb) {
        // let p = JSON.parse(path);
        // console.log("start DRAW ->>>>", p, path[0].segments);
        // board[childrenIndex] = { path: path, points: [p[1].segments[0]] };
        // cache.set(thisBoard, board);
        // socket.to(thisBoard).emit('log', cache.get("thisBoard"));

        path = JSON.parse(path);
        // path[1].segments = [];
        console.log("THIS PATH", path);

        // insert/get next ID from DB
        pool.getConnection(function(err, connection) {
            if (err) throw err; // not connected!

            // start transaction (get last insert for this board)
            connection.beginTransaction(function(err) {
                if (err) { throw err; }

                connection.query("SELECT MAX(idx) AS idx FROM paths WHERE board = ?", [thisBoard], function(error, qresults, fields) {

                    // check for error, cancel the transaction
                    if (error) { return connection.rollback(function(){ throw error; })}
                    socket.emit('log', qresults);

                    let idx;

                    // handle first insert 
                    if (qresults == null || qresults[0].idx == null) {
                        idx = -1;
                        console.log("!!ALERT!!! idx is null");
                    } else if (qresults[0].idx > -1) {
                        idx = qresults[0].idx;
                        console.log("-->qresult fine, is", idx);
                        
                    }

                    console.log("** IDX is now", idx);

                    // insert the current point
                    // console.log("    ATTEMPTING INSERT", thisBoard, (idx), path);
                    // console.log('INSERT INTO paths (board, idx, json_string) VALUES (' + mysql.escape(thisBoard) + ', ' + mysql.escape((idx + 1)) + ', ' + mysql.escape(JSON.stringify(path)) + ')');
                    connection.query('INSERT INTO paths (board, idx, json_string) VALUES (?, ?, ?)', [thisBoard, (idx + 1), JSON.stringify(path)], function(error, iresults, fields) {
                        // check for error, cancel the transaction
                        if (error) { return connection.rollback(function(){ throw error; })}

                        // let the front end know what index to use
                        cb(idx + 1);
                        console.log("Next index returned ", idx + 1);
                        
                        connection.commit(function(error){
                            // check for error, cancel the transaction
                            if (error) { return connection.rollback(function(){ throw error;})}

                            // successful
                            console.log("StartDraw insert transaction successful at ", (idx + 1));
                            socket.emit('log', "StartDraw insert transaction successful: " +  (idx + 1));
                            socket.to(thisBoard).emit('startDraw', (idx + 1), path);

                            connection.release();
                        });
                    });  
                });
            });
        });
    }); 

    socket.on('updateDraw', function(childrenIndex, xy) {
        // console.log("update DRAW", xy, board);
        // board[childrenIndex].points.push(xy);
        // cache.set(thisBoard, board);
        // socket.to(thisBoard).emit('log', cache.get("thisBoard"));
        console.log("updateDraw " + childrenIndex + " **");
        socket.to(thisBoard).emit('updateDraw', childrenIndex, xy);
    });

    socket.on('endDraw', function(index, simplifiedPath, erase = false) {
        if (erase) {
            console.log("endDraw but really endErase " + index);
        } else {
            console.log("endDraw " + index);
        }

        // get a connection to the DB and see if the board exists
        pool.getConnection(function(err, connection) {
            if (err) throw err; // not connected!

            // UPDATE THE JSON
            // overwrite the previous json since line points will be simplified
            connection.query("UPDATE paths SET json_string = ? WHERE board = ? AND idx = ?", [JSON.stringify(simplifiedPath), thisBoard, index], function(error, results, fields) {

                // check for error
                if (error) throw error;

                // handle erasing
                if (erase) {
                    socket.to(thisBoard).emit('endErase', index);
                } else {
                    socket.to(thisBoard).emit('endDraw', index);
                }
            });
        });
    });


    // socket.on('startErase', function(childrenIndex, path) {
    //     console.log("startErase");
    //     socket.to(thisBoard).emit('startErase', childrenIndex, path);
    // });

    // socket.on('updateErase', function(childrenIndex, xy) {
    //     console.log("updateErase");
    //     socket.to(thisBoard).emit('updateErase', childrenIndex, xy);
    // });

    // socket.on('endErase', function(index) {
    //     console.log("endErase");
    //     socket.to(thisBoard).emit('endErase', index);
    // });

    socket.on('undo', function(index) {
        console.log("undo");
        socket.to(thisBoard).emit('undo', index);
    });

    socket.on('redo', function(index) {
        console.log("redo");
        socket.to(thisBoard).emit('redo', index);
    });

    socket.on('pan', function(x, y) {
        console.log("pan");
        socket.to(thisBoard).emit('pan', x, y);
    });


    socket.on('error', function(error) {
        console.log("ERROR", error);
    });



});

http.listen(port, function() {
    console.log('listening on *:' + port);
});