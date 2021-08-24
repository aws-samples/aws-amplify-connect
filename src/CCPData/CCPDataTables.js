import React, { Component } from 'react';
import { Table, Checkbox, Button, Icon } from 'semantic-ui-react';
import { API } from 'aws-amplify';

function customerDataTable(items) {
  const table =
    <Table celled striped>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell colSpan='2'>{items.telephoneNumber}</Table.HeaderCell>
        </Table.Row>
      </Table.Header>

      <Table.Body>
        <Table.Row>
          <Table.Cell collapsing>
            Name
          </Table.Cell>
          <Table.Cell>{items.firstName} {items.lastName}</Table.Cell>
        </Table.Row>

        <Table.Row>
          <Table.Cell collapsing>
            Mood
          </Table.Cell>
          <Table.Cell>{items.choice}</Table.Cell>
        </Table.Row>

        <Table.Row>
          <Table.Cell collapsing>
            contactAttempts
          </Table.Cell>
          <Table.Cell>{items.contactAttempts}</Table.Cell>
        </Table.Row>

        <Table.Row>
          <Table.Cell collapsing>
            lastAttemptDateTime
          </Table.Cell>
          <Table.Cell>{items.lastAttemptDateTime}</Table.Cell>
        </Table.Row>

        <Table.Row>
          <Table.Cell collapsing>
            lastSuccessDateTime
          </Table.Cell>
          <Table.Cell>{items.lastSuccessDateTime}</Table.Cell>
        </Table.Row>

        <Table.Row>
          <Table.Cell collapsing>
            SuccessfulConnections
          </Table.Cell>
          <Table.Cell>{items.successfulConnections}</Table.Cell>
        </Table.Row>

        <Table.Row>
          <Table.Cell collapsing>
            Enabled (0=False 1=True)
          </Table.Cell>
          <Table.Cell>{items.enabled}</Table.Cell>
        </Table.Row>

        <Table.Row>
          <Table.Cell collapsing>
            Created
          </Table.Cell>
          <Table.Cell>{items.createdDateTime}</Table.Cell>
        </Table.Row>

      </Table.Body>
    </Table>;
  return table;
}

class AllCustomersDataTable extends Component {
  constructor() {
    super();
    this.state = {
      items: [],
      previousLastEvaluatedKey: "",
      lastEvaluatedKey: "",
      scanIndexForward: true,
      pageturns: 0,
      filterEnabled: true
    };
  }

  componentDidMount = async (previous = false) => {
    console.log('Retrieving customers ');
    var result;
    let myInit;
    var changeOfDirection = false;
    if (previous === false){
      if (this.state.scanIndexForward === false)
      {
        changeOfDirection = true;
      }
      console.log("Next");
      myInit = {
        body: {
          LastEvaluatedKey: this.state.lastEvaluatedKey,
          ScanIndexForward: true,
          FilterEnabled: this.state.filterEnabled,
          ChangeOfDirection: changeOfDirection
        }
      }
      this.setState({ scanIndexForward: true })
    } 
    else {
      if (this.state.scanIndexForward === true)
      {
        changeOfDirection = true;
      }
      console.log("Previous");
      myInit = {
        body: {
          LastEvaluatedKey: this.state.lastEvaluatedKey,
          ScanIndexForward: false,
          FilterEnabled: this.state.filterEnabled,
          ChangeOfDirection: changeOfDirection
        }
      }
      this.setState({ scanIndexForward: false })
    }
    console.log(myInit.body);

    try {
      result = (await API.post('api604c21a1', ('/telephonenumber/'), myInit))
      console.log(result.LastEvaluatedKey)
      const items = result.Items
      this.setState({ items: items })
      this.setState({ previousLastEvaluatedKey: this.state.lastEvaluatedKey })
      if(result.LastEvaluatedKey){
        this.setState({ lastEvaluatedKey: result.LastEvaluatedKey })
      } else
      { this.setState({ lastEvaluatedKey: "" })}
    } catch (error) {
      console.log(error)
      this.setState({ items: [] })
    }
    this.setState({ pageturns: (this.state.pageturns + 1)})
  };

  onEnabledClickHandler = async(clickitem, i, event, newState) => {
    //console.log(i);
    //console.log(event);

    var updatedItems = this.state.items;

    //Find index of specific object using findIndex method.    
    var objIndex = updatedItems.findIndex((item => item.telephoneNumber === clickitem.telephoneNumber));

    //Log object to Console.
    console.log(console.log(`Before Update: ${clickitem.telephoneNumber}"`));
    console.log(clickitem);

    //Update object
    updatedItems[objIndex].enabled = newState
    console.log('REST API Call');
    let myInit = {
      body: {data: updatedItems[objIndex]}
    }
    try {
      const result = (await API.patch('api604c21a1', ('/telephonenumber/' + clickitem.telephoneNumber), myInit))
      console.log(result)
    } catch (error) {
      console.log(error)
    }

    //Log object to console again.
    console.log("After update: ");
    console.log(updatedItems[objIndex]);

    // update State
    //this.componentDidMount() // pull from DynamoDB
    this.setState({ items: updatedItems }) // update locally and assume it worked
  }

  onDeleteClickHandler = async(clickitem, i, event) => {
    //var updatedItems = this.state.items;

    //Find index of specific object using findIndex method.    
    //var objIndex = updatedItems.findIndex((item => item.telephoneNumber === clickitem.telephoneNumber));

    //Log object to Console.
    console.log(`Delete: ${clickitem.telephoneNumber}"`);

    try {
      const result = (await API.del('api604c21a1', ('/telephonenumber/' + clickitem.telephoneNumber)))
      console.log(result)
    } catch (error) {
      console.log(error)
    }

    // update State
    this.componentDidMount() 
  }

  onFilterEnabledClickHandler = async() => {
    await this.setState({lastEvaluatedKey: ""})
    await this.setState({filterEnabled: (!this.state.filterEnabled)})
    await console.log(this.state.lastEvaluatedKey)
    await console.log(this.state.filterEnabled)

    // update State
    await this.componentDidMount()   
  }

  render() {
    //console.log("this.items");
    //console.log(this.state.items);

    var tableitems = this.state.items.sort( compare );
    var tablerows = tableitems.map(function (item, i) {
      let toggleEnabled;
      if (item.enabled === "0"){
        toggleEnabled = <Checkbox toggle checked={false} onChange={(event) => this.onEnabledClickHandler(item, i, event, "1")} /> // click enables "1"
      };
      if (item.enabled === "1") { 
        toggleEnabled = <Checkbox toggle checked={true} onChange={(event) => this.onEnabledClickHandler(item, i, event, "0")} />  // click disabled "0"
      }; 
      return <Table.Row key={i} >
        <Table.Cell collapsing>{item.telephoneNumber}</Table.Cell>
        <Table.Cell>{item.firstName} {item.lastName}</Table.Cell>
        <Table.Cell>{toggleEnabled}</Table.Cell>
        <Table.Cell><Button negative circular icon='delete' onClick={(event) => this.onDeleteClickHandler(item, i, event)}/></Table.Cell>
      </Table.Row>
    }.bind(this));

    var leftDisabled = false
    var rightDisabled = false
    if(this.state.scanIndexForward === false && this.state.lastEvaluatedKey === ""){leftDisabled = true} else {leftDisabled = false};
    if(this.state.scanIndexForward === true  && this.state.lastEvaluatedKey === ""){rightDisabled = true} else {rightDisabled = false};
    if(this.state.pageturns < 2){leftDisabled = true} // handle just started use case


    const table =
    <div>
      <Table celled striped>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Telephone</Table.HeaderCell>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell><Checkbox toggle checked={this.state.filterEnabled} onClick={(event) => this.onFilterEnabledClickHandler()}/> Enabled</Table.HeaderCell>
            <Table.HeaderCell>Delete</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {tablerows}
        </Table.Body>
      </Table>
      
      <Button icon labelPosition='left' onClick={(event) => this.componentDidMount(true)} disabled={leftDisabled}><Icon name='left arrow' />Back</Button>
      <Button icon labelPosition='right' onClick={(event) => this.componentDidMount(false)} disabled={rightDisabled}>Next<Icon name='right arrow' /></Button>
    </div>
    return table;
  }
}

// https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
function compare( a, b ) {
  if ( a.telephoneNumber < b.telephoneNumber ){
    return -1;
  } 
  else if ( a.telephoneNumber > b.telephoneNumber ){
    return 1;
  }
  return 0;
}

export { customerDataTable, AllCustomersDataTable }