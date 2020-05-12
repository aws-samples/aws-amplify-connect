import React, { Component } from 'react';
import { Input, Progress, Tab, Message, Icon } from 'semantic-ui-react';
import Amplify, { Auth, API, Storage } from 'aws-amplify';
import aws_exports from './../aws-exports';
import {customerDataTable,AllCustomersDataTable} from './CCPDataTables.js';

Amplify.configure(aws_exports);

class CCPManageCustomers extends Component {
  constructor() {
    super();
    this.state = {
      paneldata: <AllCustomersDataTable />
    };
  }

  componentDidMount = () => {
    this.setState({paneldata: <AllCustomersDataTable />})
  };

  render() {
    return (
      <div>
        {this.state.paneldata}
      </div>
    );
  }
}

class CCPDebug extends Component {
  constructor() {
    super();
    this.state = {
      phonenumber: '+447123456789',
      items: ''
    };
  }

  handleClick = async() => {
    console.log(this.state.phonenumber);
    try {
      const items = await API.get('api604c21a1', ('/telephonenumber/' + this.state.phonenumber))
      console.log(items)
      this.setState({ items: items })
    } catch (error) {
      console.log(error)
      this.setState({ items: '' })
    }
  };

  handleInputChange = e => {
    this.setState({ phonenumber: e.target.value });
  };

  render() {
    let data;
    if (this.state.items === '') {
      data = <p></p>;
    } 
    else {
      data = customerDataTable(this.state.items);
    }  

    return (
      <div>
        <Input
          action={{
            icon: "search",
            onClick: () => this.handleClick()
          }}
          defaultValue={this.state.phonenumber}
          onChange={this.handleInputChange}
          placeholder="+447123456789"
        />
        {data}
      </div>
    );
  }
}

class CCPData extends Component {
  constructor(props) {
    super(props);
    this.containerDiv = React.createRef();
    this.state = {
      phonenumber: '0',
      items: ''
    };
  }
  
  componentDidMount() {
    // eslint-disable-next-line no-undef
    connect.agent(function(agent) {

      agent.onOffline(function(agent) {
        this.setState({phonenumber: '0'});
        this.setState({ items: '' })
      }.bind(this));

      agent.onRoutable(function(agent) {
        this.setState({phonenumber: '0'});
        this.setState({ items: '' })
      }.bind(this));

    }.bind(this))

    // eslint-disable-next-line no-undef
    connect.contact(function(contact) {

      contact.onIncoming(function(contact) {
      }.bind(this));

      contact.onRefresh(function(contact) {
      }.bind(this));

      contact.onAccepted(function(contact) {
      }.bind(this));

      // Call established
      contact.onConnected(function(contact) {
      }.bind(this));

      // call ended
      contact.onEnded(function() {
      }.bind(this));

      // Triggered for the normal inbound calls.
      contact.onConnecting(function(contact) {
      }.bind(this));

      // Triggered for the Queue callbacks.
      contact.onIncoming(async function() {
        console.log(`onConnected(${contact.getContactId()})`);
        var attributeMap = contact.getAttributes();
        var phone = JSON.stringify(attributeMap["IncomingNumber"]["value"]);
        var phone = phone.replace(/"/g, '');
        console.log(phone);
        //window.alert("Customer's phone #: " + phone);
        this.setState({phonenumber: phone});

        // api call
        if (this.state.phonenumber != 0){
          try {
            const items = await API.get('api604c21a1', ('/telephonenumber/' + this.state.phonenumber))
            console.log(items)
            this.setState({ items: items })
          } catch (error) {
            console.log(error)
            //if (error.response.status === 404)
            //{
              this.setState({ items: '' })
            //}
          }
        }
        
        console.log(this.state.phonenumber);
      }.bind(this));
    }.bind(this));
  }

  render() {
    let data;
    if (this.state.items === '') {
      data = <p></p>;
    } 
    else {
      data = customerDataTable(this.state.items);
    }


    return (
      <div>
        {data}
      </div>
    );
  }
}

class CCPDataUploader extends Component {
  constructor(props) {
    super(props);
    this.containerDiv = React.createRef();
    this.state = {
      percent: 0,
      result: '',
      filename: ''
    };
  }

  async onChange(e) {
      const file = e.target.files[0];
      console.log(file)
      this.setState({filename: file.name})
      const localthis = this;
      await Storage.put(("csvupload/" + file.name), file, {
        level: 'public',
        contentType: file.type,
        //customPrefix: "csvupload",
        progressCallback(progress) {
          var currentpercent = Math.round(progress.loaded/progress.total*100)
          localthis.setState({percent: currentpercent})
          console.log('Uploading:' + localthis.state.percent)
        },
      }).then (result => {
        this.setState({result: 
          <Message success>
          <Message.Header>Uploaded</Message.Header>
          <p>{this.state.filename}</p>
        </Message>
        })
        console.log(result)
        }
      ).catch(err => {
        this.setState({result: 
        <Message negative>
          <Message.Header>Error whilst uploading</Message.Header>
          <p>{this.state.filename}</p>
        </Message>
        })
        console.log(err)
        }
      );
  }
  
  render() {
    let buttonstate;
    let progressbar;
    if (100 > this.state.percent && this.state.percent > 0 ) { 
      buttonstate = 
        <Message icon>
          <Icon name='circle notched' loading />
          <Message.Content>
            <Message.Header>Uploading</Message.Header>
            <p>{this.state.filename}</p>
          </Message.Content>
        </Message>;
      progressbar = <Progress percent={this.state.percent} indicating progress='percent'/>;
    }
    else if (100 === this.state.percent){
      buttonstate = null;
      progressbar = null;
    }
    else { 
      buttonstate = 
        <input
          type="file" accept='text/csv'
          onChange={(e) => this.onChange(e)}
        />;
      progressbar = <Progress percent={this.state.percent} indicating progress='percent'/>;
    }



    return (
        <div>
          {progressbar}
          {this.state.result}
          {buttonstate}
        </div>
    )
  }
}

class CCPDataMenu extends Component {
  constructor(props) {
    super(props);
    this.containerDiv = React.createRef();
    this.state = {
      primarygroup: '',
      activeIndex: 0
    };
  }
  _isMounted = false;

  componentDidMount() {
    this._isMounted = true;
    let group = ''

    Auth.currentAuthenticatedUser().then(user => {
      //console.log(user);
      group = user['signInUserSession']['idToken']['payload']['cognito:groups'][0]
      console.log('Primary Group: ' + group)
      if (this._isMounted) {
        this.setState({ primarygroup: group })
      }
    }).catch(e => {
      console.log(e);
      if (this._isMounted) {
        this.setState({ primarygroup: group })
      }
    });

    // eslint-disable-next-line no-undef
    connect.agent(function(agent) {
      agent.onRoutable(function(agent) {
        this.setState({ activeIndex: 0 }); 
      }.bind(this));
    }.bind(this))
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  handleTabChange = (e, { activeIndex }) => this.setState({ activeIndex })

  render() {
    var panes = [
      {
        menuItem: 'Customer',
        render: () => <Tab.Pane attached={false}><CCPData /></Tab.Pane>,
      },
      {
        menuItem: 'Lookup',
        render: () => <Tab.Pane attached={false}><CCPDebug /></Tab.Pane>,
      },
    ]

    // add Upload pane if group is Uploaders
    if (this.state.primarygroup === 'Uploaders')
    {
      panes.push({
        menuItem: 'Upload',
        render: () => <Tab.Pane attached={false}><CCPDataUploader /></Tab.Pane>,
      });
      panes.push({
        menuItem: 'Manage',
        render: () => <Tab.Pane attached={false}><CCPManageCustomers /></Tab.Pane>,
      });
    }
    
    var CCPDataTabs = () => <Tab 
      menu={{ pointing: true }} 
      activeIndex={this.state.activeIndex}
      panes={panes} 
      onTabChange={this.handleTabChange}
      />;

    return (
      <div>
        <CCPDataTabs />
      </div>
    );
  }
}

export {CCPDataMenu}