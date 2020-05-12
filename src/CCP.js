import React, { Component } from 'react';
import ccpurl from './connect-url.js'; 

class CCP extends Component {
  constructor(props) {
    super(props);
    this.containerDiv = React.createRef();
  }

  componentDidMount() {
    // eslint-disable-next-line no-undef
    connect.core.initCCP(this.containerDiv.current, {
      ccpUrl: ccpurl,
      loginPopup: true,
      loginPopupAutoClose: true,
      softphone: {
        allowFramedSoftphone: true
      }
    });
  }

  render() {
    return (
      <div 
        className="containerDiv"
        ref={this.containerDiv}
        style={{height: 465, width: 300}}
      />
    );
  }
}

export {CCP}