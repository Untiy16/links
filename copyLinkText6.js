void function $getLines($){    
    function countLines($element){
        var lines          = 0;
        var greatestOffset = void 0;

        $element.find('character').each(function(){
            if(!greatestOffset || $(this).offset().top > greatestOffset){
                greatestOffset = $(this).offset().top;
                ++lines;
            }
        });
        
        return lines;
    }
    
    $.fn.getLines = function $getLines(){
        var lines = 0;
        var clean = this;
        var dirty = this.clone();
        
        (function wrapCharacters(fragment){
            var parent = fragment;
            
            $(fragment).contents().each(function(){                
                if(this.nodeType === Node.ELEMENT_NODE){
                    wrapCharacters(this);
                }
                else if(this.nodeType === Node.TEXT_NODE){
                    void function replaceNode(text){
                        var characters = document.createDocumentFragment();
                        
                        text.nodeValue.replace(/[\s\S]/gm, function wrapCharacter(character){
                            characters.appendChild($('<character>' + character + '</>')[0]);
                        });
                        
                        parent.replaceChild(characters, text);
                    }(this);
                }
            });
        }(dirty[0]));
        
        clean.replaceWith(dirty);

        lines = countLines(dirty);
        
        dirty.replaceWith(clean);
        
        return lines;
    };
}(jQueryMod);



function getNodeIndex(node) {
    var i = 0;
    while( (node = node.previousSibling) ) {
        i++;
    }
    return i;
}

function getLastRangeRect(range) {
    var rects = range.getClientRects();
    return (rects.length > 0) ? rects[rects.length - 1] : null;
}

function pointIsInOrAboveRect(x, y, rect) {
    return y < rect.bottom && x >= rect.left && x <= rect.right;
}

function positionFromPoint(doc, x, y, favourPrecedingPosition) {
    var el = doc.elementFromPoint(x, y);
    
    var range = doc.createRange();
    range.selectNodeContents(el);
    range.collapse(true);
    
    var offsetNode = el.firstChild, offset, position, rect;
    
    if (!offsetNode) {
        offsetNode = el.parentNode;
        offset = getNodeIndex(el);
        if (!favourPrecedingPosition) {
            ++offset;
        }
    } else {
        // Search through the text node children of el
        main: while (offsetNode) {
            if (offsetNode.nodeType == 3) {
                // Go through the text node character by character
                for (offset = 0, textLen = offsetNode.length; offset <= textLen; ++offset) {
                    range.setEnd(offsetNode, offset);
                    rect = getLastRangeRect(range);
                    if (rect && pointIsInOrAboveRect(x, y, rect)) {
                        // We've gone past the point. Now we check which side (left or right) of the character the point is nearer to
                        if (rect.right - x > x - rect.left) {
                            --offset;
                        }
                        break main;
                    }
                }
            } else {
                // Handle elements
                range.setEndAfter(offsetNode);
                rect = getLastRangeRect(range);
                if (rect && pointIsInOrAboveRect(x, y, rect)) {
                    offset = getNodeIndex(offsetNode);
                    offsetNode = el.parentNode;
                    if (!favourPrecedingPosition) {
                        ++offset;
                    }
                    break main;
                }
            }
            
            offsetNode = offsetNode.nextSibling;
        }
        if (!offsetNode) {
            offsetNode = el;
            offset = el.childNodes.length;
        }
    }

    return {
        offsetNode: offsetNode,
        offset: offset
    };
}

function createSelectionFromPoint(anchorX, anchorY, focusX, focusY) {
    var doc = document;
    var start, end, range = null;
    var startX, startY, endX, endY;
    var backward = focusY < anchorY || (anchorY == focusY && focusX < anchorX);
    
    if (backward) {
        startX = focusX;
        startY = focusY;
        endX = anchorX;
        endY = anchorY;
    } else {
        startX = anchorX;
        startY = anchorY;
        endX = focusX;
        endY = focusY;
    }
    
    if (typeof doc.body.createTextRange != "undefined") {
        range = doc.body.createTextRange();
        range.moveToPoint(startX, startY);
        var endRange = range.duplicate();
        endRange.moveToPoint(endX, endY);
        range.setEndPoint("EndToEnd", endRange);
        range.select();
    } else {
        if (typeof doc.caretPositionFromPoint != "undefined") {
            start = doc.caretPositionFromPoint(startX, startY);
            end = doc.caretPositionFromPoint(endX, endY);
            range = doc.createRange();
            range.setStart(start.offsetNode, start.offset);
            range.setEnd(end.offsetNode, end.offset);
        } else if (typeof doc.caretRangeFromPoint != "undefined") {
            start = doc.caretRangeFromPoint(startX, startY);
            end = doc.caretRangeFromPoint(endX, endY);
            range = doc.createRange();
            range.setStart(start.startContainer, start.startOffset);
            range.setEnd(end.startContainer, end.startOffset);
        } else if (typeof doc.elementFromPoint != "undefined" && "getClientRects" in doc.createRange()) {
            start = positionFromPoint(doc, startX, startY);
            end = positionFromPoint(doc, endX, endY);
            range = doc.createRange();
            range.setStart(start.offsetNode, start.offset);
            range.setEnd(end.offsetNode, end.offset);
        }
        if (range !== null && typeof window.getSelection != "undefined") {
            var sel = window.getSelection();
            sel.removeAllRanges();
            if (backward && sel.extend) {
                var endRange = range.cloneRange();
                endRange.collapse(false);
                sel.addRange(endRange);
                sel.extend(range.startContainer, range.startOffset);
            } else {
                sel.addRange(range);
            }
        }
    }
}

// var this = document.getElementById("ex2");
var mouseMoved = false;
var start_coods = {};
    start_coods.x = 0;
    start_coods.y = 0;
var end_coods = {};
    end_coods.x = 0;
    end_coods.y = 0;
var signChanged = false;


function resetEvents($el) {
    $el.off('dragstart.linkselection');
    jQueryMod(document).off('mousemove.linkselection');
    mouseMoved = false;

}


jQueryMod('a').on('mousedown.linkselection', function (downEvent) {

    let $this = jQueryMod(this);
    let this_a = this;
    start_coods.x = downEvent.clientX;
    start_coods.y = downEvent.clientY;

    let thisYCoord = downEvent.pageY - jQueryMod(this).offset().top;

    let linesCount = 4;
    let thisHeight = this.offsetHeight;
    let thisLineHeight = thisHeight / linesCount;
    let lineStart = 0;
    let lineEnd = thisLineHeight;
    let currentLine = 1;

    for(var i = 1; i <= linesCount; i++){
        if( (thisYCoord >= lineStart) && (thisYCoord <= lineEnd) ){
            currentLine = i; break
        } else{
            lineStart += thisLineHeight;
            lineEnd += thisLineHeight;
        }        
    }

    // if(currentLine == 1){
    //     start_coods.y = $(this).offset().top;
    // }else if(currentLine == linesCount){
    //     start_coods.y = ($(this).offset().top + thisHeight) - thisLineHeight + 1;
    // }else {
    //     start_coods.y = $(this).offset().top + (thisLineHeight * (currentLine - 1)) + 1;
    // }
        // start_coods.y = 62 + 17.75;
    // console.log( start_coods.y)


    if (this.attributes.href) {
        $this.on('click', function(clickEvent) {
            if (mouseMoved) {
                clickEvent.preventDefault();
            }
            resetEvents($this);
        });
    }
    
    jQueryMod(document).one('mouseup', function () {
        resetEvents($this);
    });

    jQueryMod(document).on('mousemove.linkselection', function (moveEvent) {
        let moveOffsetX = moveEvent.pageX - downEvent.pageX;
        let moveOffsetY = Math.abs(moveEvent.pageY - downEvent.pageY);

        // console.log('moveOffsetX', Math.abs(moveOffsetX))
        // console.log('moveOffsetY', Math.abs(moveOffsetY))

        // console.log(moveOffset)
        if(Math.sign(moveOffsetX) == 1 || Math.sign(moveOffsetX) == 0){
            if(currentLine == 1){
                start_coods.y = $this.offset().top;
            }else if(currentLine == linesCount){
                start_coods.y = ($this.offset().top + thisHeight) - thisLineHeight + 1;
            }else {
                start_coods.y = $this.offset().top + (thisLineHeight * (currentLine - 1)) + 1;
            }
        }else if(Math.sign(moveOffsetX) == -1){
            if(currentLine == 1){
                start_coods.y = $this.offset().top + thisLineHeight - 1;
            }else if(currentLine == linesCount){
                start_coods.y = ($this.offset().top + thisHeight) - 1;
            }else {
                start_coods.y = $this.offset().top + (thisLineHeight * currentLine) - 1;
            }                    
        }



        if(!mouseMoved){
            if (Math.abs(moveOffsetX) >= 3 && moveOffsetY < 3) {
                // This prevents the text selection being dragged
                $this.on('dragstart.linkselection', function (dragEvent) {
                    dragEvent.preventDefault();
                });

                mouseMoved = true;
            }
            else if(moveOffsetY >= 3){
                resetEvents($this);
            }
        }

        if(mouseMoved){
            end_coods.x = moveEvent.clientX;
            end_coods.y = moveEvent.clientY;
            createSelectionFromPoint(start_coods.x, start_coods.y, end_coods.x, end_coods.y);
        }
    });

});