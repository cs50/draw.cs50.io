import React, { Component } from 'react';
import {SketchField, Tools} from 'react-sketch';
import Gesture from 'rc-gesture';

let lineWidthBuffer = 0;

class Drawing extends Component {

  constructor(props) {
    super(props);
    this.state = {
      lineWidth: 3,
      lineColor: 'white',
      drawings: [],
      backgroundColor: '#000000',
      fingerCount: 1,
      canUndo: false,
      canRedo: false,
      activeFingers: 0,
      canvasHeight: window.innerHeight,
      onGestureOverride: false,
      width: '1920px',
      height: '6000px',
      scaleX: 1,
      scaleY: 1,
      hotSpotColor: 'transparent',
      hideToolBar: true
    };

    lineWidthBuffer = this.state.lineWidth;
  }

  componentDidMount = () => {
    document.getElementById('sketchField').ontouchstart = this.onTouchStart;
    document.getElementById('sketchField').ontouchend = this.onTouchEnd;
    document.getElementById('topLeftHotSpot').ontouchstart = this.handleTopLeftHotSpot;
    document.getElementById('topRightHotSpot').ontouchstart = this.handleTopRightHotSpot;
    document.getElementById('bottomLeftHotSpot').ontouchstart = this.handleTopLeftHotSpot;
    document.getElementById('bottomRightHotSpot').ontouchstart = this.handleTopRightHotSpot;
  };

  handleTopLeftHotSpot = () => {
    this._undo();
  }

  handleTopRightHotSpot = () => {
    this._redo();
  }

  handleBottomLeftHotSpot = () => {
    this._undo();
  }

  handleBottomRightHotSpot = () => {
    this._redo();
  }

  _save = () => {
    let drawings = this.state.drawings;
    drawings.push(this._sketch.toDataURL());
    this.setState({drawings: drawings});
  };

  _removeMe = (index) => {
    let drawings = this.state.drawings;
    drawings.splice(index, 1);
    this.setState({drawings: drawings});
};

  _undo = () => {
    if (!this.state.canUndo) {
      return;
    };
    this._sketch.undo();
    this.setState({
        canUndo: this._sketch.canUndo(),
        canRedo: this._sketch.canRedo()
    });
  };

  _redo = () => {
    if (!this.state.canRedo) {
      return;
    };
    this._sketch.redo();
    this.setState({
        canUndo: this._sketch.canUndo(),
        canRedo: this._sketch.canRedo()
    });
  };

  _clear = () => {
    this._sketch.clear();
    this._sketch.setBackgroundFromDataUrl('');
    this.setState({
        controlledValue: null,
        backgroundColor: 'transparent',
        fillWithBackgroundColor: false,
        canUndo: this._sketch.canUndo(),
        canRedo: this._sketch.canRedo()
    })
  };

  _onSketchChange = () => {
    let prev = this.state.canUndo;
    let now = this._sketch.canUndo();
    if (prev !== now) {
        this.setState({canUndo: now});
    }
  };

  increaseStroke = () => {

    lineWidthBuffer = this.state.lineWidth + 1;

    if (lineWidthBuffer > 50) {
      lineWidthBuffer = 50;
      this.setState({lineWidth: lineWidthBuffer});
      return;
    };

    this.setState({lineWidth: lineWidthBuffer});

  }

  decreaseStroke = () => {
    if (this.state.lineWidth === 3) {
      lineWidthBuffer = this.state.lineWidth;
      return;
    };

    this.setState({lineWidth: this.state.lineWidth - 1});
    lineWidthBuffer = this.state.lineWidth - 1;
    if (this.state.lineWidth < 1) {
      this.setState({lineWidth: 3});
      lineWidthBuffer = 3;
      return;
    }
  }

  onTouchStart = (event) => {
    event.preventDefault();
    this.setState({activeFingers: event.touches.length});
  };

  onTouchEnd = (event) => {
    // reset stroke
    if (event.touches.length === 0) {
      this.setState({lineColor: 'white'});
      this.setState({lineWidth: lineWidthBuffer});
    };
    this.setState({activeFingers: event.touches.length});
  };


  render() {

    return (
      <div>

      <div id="topLeftHotSpot" style={{position: 'fixed', top:0, left:0, zIndex: 1000, width:100, height:100, backgroundColor: (this.state.hotSpotColor)}} ></div>
      <div id="topRightHotSpot" style={{position: 'fixed', top:0, left:(window.innerWidth - 100), zIndex: 1000, width:100, height:100, backgroundColor: (this.state.hotSpotColor)}}></div>
      <div id="bottomLeftHotSpot" style={{position: 'fixed', bottom:0, left:0, zIndex: 1000, width:100, height:100, backgroundColor: (this.state.hotSpotColor)}}></div>
      <div id="bottomRightHotSpot" style={{position: 'fixed', bottom:0, left:(window.innerWidth - 100), zIndex: 1000, width:100, height:100, backgroundColor: (this.state.hotSpotColor)}}></div>

      <div hidden={this.state.hideToolBar} id="toolBar" style={{position: 'fixed', left:(window.innerWidth/2-270), zIndex: 1100, paddingLeft:30, paddingTop:15, color:'white', opacity: 0.1}} unselectable="on">
      <span>&nbsp;&nbsp;&nbsp;</span>
      <i className="fas fa-undo" style={{cursor: "pointer"}} onClick={this._undo} touchstart={this._undo} disabled={!this.state.canUndo} unselectable="on"></i>
      <span>&nbsp;&nbsp;&nbsp;</span>
      <i className="fas fa-redo" style={{cursor: "pointer"}} onClick={this._redo} touchstart={this._redo} disabled={!this.state.canRedo} unselectable="on"></i>
      <span>&nbsp;&nbsp;&nbsp;</span>
      <i className="fas fa-plus" style={{cursor: "pointer"}} onClick={this.increaseStroke} touchstart={this.increaseStroke} unselectable="on"></i>
      <span>&nbsp;&nbsp;&nbsp;</span>
      <span>{this.state.lineWidth}</span>
      <span>&nbsp;&nbsp;&nbsp;</span>
      <i className="fas fa-minus" style={{cursor: "pointer"}} onClick={this.decreaseStroke} touchstart={this.decreaseStroke} unselectable="on"></i>
      <span>&nbsp;&nbsp;&nbsp;</span>
      <span>Active fingers: {this.state.activeFingers}</span>
      <span>&nbsp;&nbsp;&nbsp;</span>
      <span>Scale: {this.state.scaleX}</span>
      </div>

      <Gesture enableRotate='true'
               enablePinch='true'

               onRotateStart={(gestureStatus) => {

                 // erase
                 if (gestureStatus.startTouches.length === 2) {
                   this.setState({lineColor: 'black'});
                   this.setState({lineWidth: this.state.lineWidth + 30});
                   return;
                 };

                 // preparation
                 if (gestureStatus.startTouches.length === 4) {
                   this.setState({lineColor: 'transparent'});
                   return;
                 };

                 if (gestureStatus.startTouches.length === 5) {
                   this.setState({lineColor: 'transparent'});
                   if (this.state.onGestureOverride) {
                     this.setState({onGestureOverride: false});
                     document.getElementById('activeSketch').style.zIndex = 1;
                     document.getElementById('activeSketch').style.opacity = 1;
                     this.setState({lineWidth: lineWidthBuffer});
                     this.setState({lineColor: 'white'});
                     return;
                   } else {
                     this.setState({onGestureOverride: true});
                     document.getElementById('activeSketch').style.zIndex = -20;
                     // document.getElementById('activeSketch').style.opacity = 0.5;
                   };
                 }
               }}

               onRotateMove={(gestureStatus) => {
                 if (!this.state.onGestureOverride) {
                   return;
                 };

                 if (gestureStatus.startTouches.length > 7 && gestureStatus.moveStatus.x < -30) {
                   this._clear();
                   this.setState({lineColor: 'transparent'});
                   this.setState({lineWidth: lineWidthBuffer});
                   document.getElementById('activeSketch').style.transform = "scale(1, 1)";
                   window.scrollTo(0,0);
                   return;
                 };

                 // trigger scale
                 if (Math.abs(gestureStatus.scale - 1) > 0.2) {

                   if (this.state.didScale === true && gestureStatus.scale < 0.95) {

                     document.getElementById('activeSketch').style.transform = String("scale(" + String((this.state.scaleX - 0.1)) + ", " + String(this.state.scaleY - 0.1) + ")");

                     if (this.state.scaleX - 0.05 < 1) {
                       this.setState({scaleX: 1});
                       this.setState({scaleY: 1});
                       this.setState({didScale: false});
                       return;
                     }
                     this.setState({scaleX: (this.state.scaleX - 0.1)});
                     this.setState({scaleY: (this.state.scaleX - 0.1)});
                     return;
                   }

                   // proportionally scale thickness of pen
                   let tempLineWidth = this.state.lineWidth;
                   tempLineWidth = tempLineWidth - 2 * (gestureStatus.scale);

                   if (tempLineWidth <= 3) {
                     tempLineWidth = 3;
                     lineWidthBuffer = tempLineWidth;
                     this.setState({lineWidth: tempLineWidth});
                   };

                   if (this.state.scaleX > 3) {
                     tempLineWidth = 3;
                     lineWidthBuffer = tempLineWidth;
                     this.setState({lineWidth: tempLineWidth});
                   };

                   this.setState({lineWidth: tempLineWidth});
                   this.setState({scaleX: (this.state.scaleX + 0.1)});
                   this.setState({scaleY: (this.state.scaleX + 0.1)});

                   if (gestureStatus.scale - 0.2 < 1 && gestureStatus.scale < 0.95) {
                     document.getElementById('activeSketch').style.transform = "scale(1, 1)";
                     this.setState({scaleX: 1});
                     this.setState({scaleY: 1});
                     this.setState({lineWidth: lineWidthBuffer});
                     return;
                   }

                   document.getElementById('activeSketch').style.transform = String("scale(" + String((this.state.scaleX + 0.1)) + ", " + String(this.state.scaleY + 0.1) + ")");

                 } else if (Math.abs(gestureStatus.moveStatus.x) > 20 || Math.abs(gestureStatus.moveStatus.y) > 20) {
                   window.scrollBy(-gestureStatus.moveStatus.x/10, -gestureStatus.moveStatus.y/10);
                 }
               }}

               onRotateEnd={(gestureStatus) => {
                 if (!this.state.onGestureOverride) {
                   return;
                 };
                 if (this.state.scaleX > 1) {
                   this.setState({didScale: true});
                 } else {
                   this.setState({didScale: false});
                 }
                 this.setState({onGestureOverride: false});
                 this.setState({lineWidth: lineWidthBuffer});
                 document.getElementById('activeSketch').style.zIndex = 1;
                 document.getElementById('activeSketch').style.opacity = 1;
               }}
               >

      <div id="sketchField" style={{zIndex: 1}}>
      <div id="activeSketch" style={{transformOrigin: "top", zIndex: 1}}>
      <SketchField width={this.state.width}
                   height={this.state.height}
                   ref={(c) => this._sketch = c}
                   undoSteps='1000'
                   onChange={this._onSketchChange}
                   tool={Tools.Pencil}
                   lineColor={this.state.lineColor}
                   lineWidth={this.state.lineWidth}
                   style={{backgroundColor: 'black'}}/>
      </div>
      </div>
      </Gesture>
      </div>
    );
  }
}

export default Drawing;
