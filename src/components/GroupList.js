import React from 'react';
import {View, Text, StyleSheet, Image, Dimensions, TouchableOpacity} from 'react-native';
import {connect} from 'react-redux';
import {withNavigation} from 'react-navigation';
import { ListItem, TouchableScale } from 'react-native-elements'
import LinearGradient from 'react-native-linear-gradient';

import { setChannel, setPrivateChannel } from '../redux/actions/channelActions';

const ScreenHeigth = Dimensions.get('window').height;
const ScreenWidth = Dimensions.get('window').width;

class GroupList extends React.Component {

    shouldComponentUpdate(nextProps, nextState) {
        return nextProps.isTyping !== this.props.isTyping;
    }

    handlePress = () => {
        this.props.setPrivateChannel(false);
        this.props.setChannel(this.props.channel);
        this.props.navigation.navigate('ChatWindow');
    }

    render() {
        const { channel } = this.props;
        console.log('FLATLIST CHANNEL');
        return (
                <ListItem
                    onPress={this.handlePress}
                    containerStyle={{ backgroundColor: 'transparent', elevation: 0.4 }}
                    leftAvatar={{ rounded: true, source: { uri: channel.iconUrl } }}
                    title={channel.name}
                    titleStyle={{ color: 'white', fontFamily: 'RobotoMono-Regular', fontSize: 14 }}
                    subtitle={
                        this.props.isTyping && this.props.isTyping.typing ? 
                        <Text style={{ color: '#1DB954', fontFamily: 'RototoMono-Regular', fontSize: 10 }}>Typing..</Text>
                        : channel.about
                    }
                    subtitleStyle={{ color: 'grey', fontSize: 12 }}
                    chevron={{ color: 'grey' }}
            />
        )
    }
}

const styles = StyleSheet.create({
    container: {
        margin: ScreenHeigth*0.02,
        backgroundColor: 'red',
        flex: 1
        //borderRadius: 20
        //flexDirection: 'row'
    },
    itemContainer: {
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        height: ScreenHeigth*0.08
    },
    imageContainer: {
        flex: 0.1,
        marginLeft: ScreenWidth*0.04
    },  
    detailsContainer: {
        flex: 0.7,
        marginLeft: ScreenWidth*0.05
    },
    status: {
        flex: 0.2
    },
    nameText: {
        fontFamily: 'RobotoMono-Medium'
    }
})


export default withNavigation(connect(null, {setChannel, setPrivateChannel})(GroupList));