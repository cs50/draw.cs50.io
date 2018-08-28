import React, { Component } from 'react';
import {SketchField, Tools} from 'react-sketch';
import Gesture from 'rc-gesture';

let tempLineWidth = 0;

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
      onGestureOverride: false
    };

    tempLineWidth = this.state.lineWidth;
  }

  componentDidMount = () => {
    document.getElementById('sketchField').ontouchstart = this.onTouchStart;
    document.getElementById('sketchField').ontouchend = this.onTouchEnd;
  };

  _save = () => {
    let drawings = this.state.drawings;
    drawings.push(this._sketch.toDataURL());
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
    })

  };

  _redo = () => {

    if (!this.state.canRedo) {
      return;
    };

    this._sketch.redo();
    this.setState({
        canUndo: this._sketch.canUndo(),
        canRedo: this._sketch.canRedo()
    })
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

  increaseStroke = (event) => {
    event.preventDefault();
    this.setState({lineWidth: this.state.lineWidth + 1});
    tempLineWidth = this.state.lineWidth + 1;
  }

  decreaseStroke = (event) => {
    event.preventDefault();

    if (this.state.lineWidth === 1) {
      tempLineWidth = this.state.lineWidth;
      return;
    };

    this.setState({lineWidth: this.state.lineWidth - 1});
    tempLineWidth = this.state.lineWidth - 1;
    if (this.state.lineWidth < 1) {
      this.setState({lineWidth: 1});
      tempLineWidth = 1;
      return;
    }
  }

  onTouchStart = (event) => {

    event.preventDefault();
    this.setState({activeFingers: event.touches.length});

  };

  onTouchEnd = (event) => {
    if (event.touches.length === 0) {
      this.setState({lineColor: 'white'});
      this.setState({lineWidth: tempLineWidth});
    };
  };


  render() {

    return (
      <div>

      <div id="toolBar" style={{position: 'fixed', zIndex: 10, paddingLeft:30, paddingTop:15, color:'white', opacity: 0.1, transform: 'scale(1.1,1.1)'}} unselectable="on">
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
      <span>Gestures Mode: {this.state.onGestureOverride ? 'Activated' : 'Deactivated'}</span>
      </div>

      <Gesture enableRotate='true'
               enablePinch='true'

               onPinchMove={(gestureStatus) => {
                 if (!this.state.onGestureOverride) {
                   return;
                 };

                 if (gestureStatus.startTouches.length !== 2) {
                   return;
                 }
                 window.scrollBy(-gestureStatus.moveStatus.x/20, -gestureStatus.moveStatus.y/20);
               }}

               onRotateEnd={(gestureStatus) => {

                 if (gestureStatus.startTouches.length === 3 || gestureStatus.startTouches.length === 4) {
                   this.setState({lineColor: 'black'});
                   this.setState({lineWidth: 50});
                   return;
                 };

                 if (gestureStatus.startTouches.length > 8) {
                   this._clear();
                   this.setState({lineColor: 'white'});
                   this.setState({lineWidth: tempLineWidth});
                   return;
                 }

                 if (gestureStatus.startTouches.length === 5) {
                   this.setState({lineColor: 'transparent'});
                   if (this.state.onGestureOverride) {
                     this.setState({onGestureOverride: false});
                     document.getElementById('activeSketch').style.zIndex = 1;
                     document.getElementById('activeSketch').style.opacity = 1;
                     this.setState({lineWidth: tempLineWidth});
                     this.setState({lineColor: 'white'});
                     return;
                   } else {
                     this.setState({onGestureOverride: true});
                     document.getElementById('activeSketch').style.zIndex = -20;
                     document.getElementById('activeSketch').style.opacity = 0.5;
                     return;
                   };
                 }
               }}

               onSwipeLeft={(gestureStatus) => {
                 if (!this.state.onGestureOverride) {
                   return;
                 };
                 this._undo();
               }}

               onSwipeRight={(gestureStatus) => {
                 if (!this.state.onGestureOverride) {
                   return;
                 };
                 this._redo();
               }}
               >

      <div id="sketchField" style={{zIndex: 1}}>
      <div id="activeSketch" style={{position: 'relative', zIndex: 1}}>
      <SketchField width='1920px'
                   height='6000px'
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
