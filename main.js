/*
 * Copyright 2013 Cameron McKay
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
*
* Copyright 2015 Bradley Duncan
*
* This file has been updated and had changes made utilising the code
* these changes are not covered in the Apache License that this software is
* distributed with.
*
* The content author(s) reserves all rights
*
 */

/*
*
* DEVELOPER NOTES:
* Make sure that tilesheet width / height are divisible by the tile height / width in the map file
*
 */


// TODO: Implement preloading progress bar from here: http://codepen.io/MrHill/pen/avKfz
// TODO: onReady put an overlay over the whole app with the progress bar of preloading all
// TODO: images in the game. Then add connecting to the multiplayer server etc at later date.
// TODO: I've put commented out console.log events to show the images that need to be preloaded.
// TODO: Search this document for "preload" (2 occurances).

require.config({
    paths: {
        jquery: "lib/jquery",
        zlib: "lib/zlib.min",
        tmxjs: "src"
    },
    shim: {
        zlib: { exports: "Zlib" }
    }
});

require([
    "jquery",
    "tmxjs/map",
    "tmxjs/util/util"
], function (
    $,
    Map,
    U
) {
    var url = "maps/kanto.tmx";
    var options = {
        dir: url.split("/").slice(0, -1) || "."
    };

    var startBufRender = false;

    $.get(url, {}, null, "xml")
        .done(function (xml) {
            Map.fromXML(xml, options).done(function (map) {
                // Export to XML when "x" key pressed.
                /*$(document).on("keypress", function (event) {
                    if (String.fromCharCode(event.which) === "x") {
                        var doc = map.toXML(options);
                        console.log(doc.context);
                    }
                });*/

                /*  DEBUG
                console.log(map);
                $.each(map.tileSets, function () {
                    console.log(this);
                });
                */

                var canvas = $("#map").css({
                    width: map.bounds.w * map.tileInfo.w,
                    height: map.bounds.h * map.tileInfo.h
                });

                var used_layers = ["Ground"];

                var current_render_layer = "Ground";
                var current_width = 0;
                var current_height = 0;
                var current_render_x = 0;
                var current_render_y = 0;

                var ruleSets = {};
                $.each(map.layers, function (ln, layer) {
                    $.each(layer.cells, function (tn, cell) {
                        if (!cell) return true;

                        var i = tn % layer.bounds.w;
                        var j = Math.floor(tn / layer.bounds.w);
                        var tileSet = cell.tile.tileSet;

                        if (layer['name'] == "Ground") {

                        var flippedClass = U.format("flipped-{0}-{1}-{2}",
                            +cell.flipped.horizontally,
                            +cell.flipped.vertically,
                            +cell.flipped.antidiagonally);
                        var classes = [
                            "tile-set",
                            "tile-set-" + tileSet.firstGlobalId,
                            "tile",
                            "tile-" + cell.tile.getGlobalId(),
                            flippedClass
                        ];

                        var format, ruleSet;
                        if (!ruleSets["tile-set-"] + tileSet.firstGlobalId) {
                            format = [
                                "background-image: url({0});"
                            ].join("/");
                            ruleSet = U.format(format, options.dir + "/" + cell.tile.imageInfo.source);
                            ruleSets["tile-set-" + tileSet.firstGlobalId] = ruleSet;

                            //console.log("preload: " + cell.tile.imageInfo.source);
                        }
                        if (!ruleSets["tile-" + cell.tile.getGlobalId()]) {
                            format = [
                                "width: {0}px;",
                                "height: {1}px;",
                                "background-repeat: no-repeat;",
                                "background-position: {2}px {3}px;"
                            ].join(" ");
                            ruleSet = U.format(format,
                                +cell.tile.bounds.w,
                                +cell.tile.bounds.h,
                                -cell.tile.bounds.x,
                                -cell.tile.bounds.y
                            );
                            ruleSets["tile-" + cell.tile.getGlobalId()] = ruleSet;
                        }
                        if (!ruleSets[flippedClass]) {
                            var m = [1, 0, 0, 1];
                            if (cell.flipped.antidiagonally) {
                                m[0] = 0;
                                m[1] = 1;
                                m[2] = 1;
                                m[3] = 0;
                            }
                            if (cell.flipped.horizontally) {
                                m[0] = -m[0];
                                m[2] = -m[2];
                            }
                            if (cell.flipped.vertically) {
                                m[1] = -m[1];
                                m[3] = -m[3];
                            }
                            var matrix = U.format("matrix({0}, {1}, {2}, {3}, 0, 0)", m[0], m[1], m[2], m[3]);
                            var dxMatrix = U.format(
                                "progid:DXImageTransform.Microsoft.Matrix(M11={0},M12={1},M21={2},M22={3},sizingMethod='auto expand')",
                                m[0], m[1], m[2], m[3]
                            );
                            ruleSet = [
                                "-moz-transform: " + matrix + ";",
                                "-o-transform: " + matrix + ";",
                                "-webkit-transform: " + matrix + ";",
                                "transform: " + matrix + ";",
                                '-ms-filter: "' + dxMatrix + '";',
                                "filter: " + dxMatrix + ";"
                            ].join(" ");
                            ruleSets[flippedClass] = ruleSet;
                        }

                        $("<div>", {
                            'id': 'tile-' + tn,
                            'class': classes.join(" "),
                            'style': U.format("left: {0}px; top: {1}px;",
                                i * cell.tile.bounds.w,
                                j * cell.tile.bounds.h
                            )
                        }).appendTo(canvas);

                    } else { //render as 3d object

                            var render_x = parseInt(i * cell.tile.bounds.w);
                            var render_y = parseInt(j * cell.tile.bounds.h);

                            if(layer['name'].indexOf(" ") != -1) {
                                console.error("libCube\nMAP ERROR: Layer name has a space in it \"" + layer['name'] + "\" (" + url + ")");
                            }

                            if(used_layers.indexOf(layer['name']) == -1) { //if layer hasn't been rendered yet
                                $("#map").append("<div id='obj-" + layer['name'] + "' class='dynamicObject' style='position: absolute; z-index: 2; left: " + render_x + "px; top: " + render_y + "px'></div>");
                                used_layers.push(layer['name']);

                                //DEBUG: console.log("X: " + parseInt(i * cell.tile.bounds.w) + " Y: " + parseInt(j * cell.tile.bounds.h));
                            }

                            if (current_render_layer == layer['name']) {
                                if (render_x > current_render_x) {
                                    current_render_x = render_x;
                                    current_width += cell.tile.bounds.w;
                                }
                                if (render_y > current_render_y) {
                                    current_render_y = render_y;
                                    current_height += cell.tile.bounds.h;
                                }
                            } else {
                                $("#obj-" + current_render_layer).css("width",parseInt(current_width+25) + "px");
                                if (current_height == 0) {
                                    $("#obj-" + current_render_layer).css("height",parseInt(current_height+25) + "px");
                                } else {
                                    $("#obj-" + current_render_layer).css("height",parseInt(current_height) + "px");
                                }
                                current_render_layer = layer['name'];
                                current_width = 0;
                                current_height = 0;
                                current_render_x = 0;
                                current_render_y = 0;
                            }


                                var flippedClass = U.format("flipped-{0}-{1}-{2}",
                                    +cell.flipped.horizontally,
                                    +cell.flipped.vertically,
                                    +cell.flipped.antidiagonally);
                                var classes = [
                                    "tile-set",
                                    "tile-set-" + tileSet.firstGlobalId,
                                    "tile",
                                    "tile-" + cell.tile.getGlobalId(),
                                    flippedClass
                                ];

                                var format, ruleSet;
                                if (!ruleSets["tile-set-"] + tileSet.firstGlobalId) {
                                    format = [
                                        "background-image: url({0});"
                                    ].join("/");
                                    ruleSet = U.format(format, options.dir + "/" + cell.tile.imageInfo.source);
                                    ruleSets["tile-set-" + tileSet.firstGlobalId] = ruleSet;
                                    //console.log("preload: " + cell.tile.imageInfo.source);
                                }
                                if (!ruleSets["tile-" + cell.tile.getGlobalId()]) {
                                    format = [
                                        "width: {0}px;",
                                        "height: {1}px;",
                                        "background-repeat: no-repeat;",
                                        "background-position: {2}px {3}px;"
                                    ].join(" ");
                                    ruleSet = U.format(format,
                                        +cell.tile.bounds.w,
                                        +cell.tile.bounds.h,
                                        -cell.tile.bounds.x,
                                        -cell.tile.bounds.y
                                    );
                                    ruleSets["tile-" + cell.tile.getGlobalId()] = ruleSet;
                                }
                                if (!ruleSets[flippedClass]) {
                                    var m = [1, 0, 0, 1];
                                    if (cell.flipped.antidiagonally) {
                                        m[0] = 0;
                                        m[1] = 1;
                                        m[2] = 1;
                                        m[3] = 0;
                                    }
                                    if (cell.flipped.horizontally) {
                                        m[0] = -m[0];
                                        m[2] = -m[2];
                                    }
                                    if (cell.flipped.vertically) {
                                        m[1] = -m[1];
                                        m[3] = -m[3];
                                    }
                                    var matrix = U.format("matrix({0}, {1}, {2}, {3}, 0, 0)", m[0], m[1], m[2], m[3]);
                                    var dxMatrix = U.format(
                                        "progid:DXImageTransform.Microsoft.Matrix(M11={0},M12={1},M21={2},M22={3},sizingMethod='auto expand')",
                                        m[0], m[1], m[2], m[3]
                                    );
                                    ruleSet = [
                                        "-moz-transform: " + matrix + ";",
                                        "-o-transform: " + matrix + ";",
                                        "-webkit-transform: " + matrix + ";",
                                        "transform: " + matrix + ";",
                                        '-ms-filter: "' + dxMatrix + '";',
                                        "filter: " + dxMatrix + ";"
                                    ].join(" ");
                                    ruleSets[flippedClass] = ruleSet;
                                }

                                $("<div>", {
                                    'id': 'tile-' + tn,
                                    'class': classes.join(" "),
                                    'style': U.format("position: static !important; float: left;",    //default 'style': U.format("left: {0}px; top: {1}px;",
                                        i * cell.tile.bounds.w,
                                        j * cell.tile.bounds.h
                                    )
                                }).appendTo("#obj-" + layer['name']);
                            }

                        return true;

                    });
                });
                // Create the CSS classes.
                var styleSheet = [ ".tile { position: absolute; }" ];
                $.each(ruleSets, function (key, value) {
                    styleSheet.push(U.format(".{0} { {1} }", key, value));
                });
                var style = $("<style>", { type: 'text/css' })
                    .html(styleSheet.join("\n"))
                    .appendTo($("head"));
            });
        })
        .fail(function () {
            alert("Failed to open TMX file.");
        });
});