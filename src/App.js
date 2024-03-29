import React, { Component } from 'react';
import { Grid, Segment } from 'semantic-ui-react';
import Amplify from 'aws-amplify';
import aws_exports from './aws-exports';
import { CCP } from './CCP.js';
import { CCPDataMenu } from './CCPData/CCPData.js';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import 'amazon-connect-streams';

Amplify.configure(aws_exports);

class App extends Component {
  render() {
    return (
      <Grid columns={2} stackable>
        <Grid.Row stretched>
          <Grid.Column width={4}>
            <Segment><CCP /></Segment>
          </Grid.Column>
          <Grid.Column width={12}>
            <Segment><CCPDataMenu /></Segment>
          </Grid.Column>
        </Grid.Row>
        <AmplifySignOut />
      </Grid>
    );
  }
}

export default withAuthenticator(App);

