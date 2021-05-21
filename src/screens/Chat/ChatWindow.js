import React from 'react'
import { View, Text, TouchableOpacity, Keyboard, AppState, Clipboard, StatusBar } from 'react-native';
import { withNavigation, NavigationEvents } from 'react-navigation';
import { GiftedChat, InputToolbar} from 'react-native-gifted-chat';
import Geolocation from '@react-native-community/geolocation';
import LinearGradient from 'react-native-linear-gradient';

import { Header } from 'react-native-elements';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { BackButton, Center, RightChatIcon } from '../../components/HeaderComponents';

import Modal from 'react-native-modal';
import GiphyComponent from '../../components/GiphyComponent';
import TimerModal from '../../components/TimerModal';
import SelectMessage from '../../components/SelectMessage';

import MessageComponent from '../../components/MessageComponent';

import {connect} from 'react-redux';
import {GIPHY_API_KEY, MESSAGE_REMOVER_CLOUD_URL} from '../../config/constants';
import firebase from '@react-native-firebase/app';

import axios from 'axios';
import { setProfile } from '../../redux/actions/authActions';
import { debounce } from '../../helpers'

class ChatWindow extends React.Component {

  abortController = new window.AbortController();

  state = {
    messages: [],
    gif_modal_visible: false,
    timer_modal_visible: false,
    bubble_modal_visible: false,
    messagesRef: firebase.firestore().collection('messages'),
    
    privateMessagesRef: firebase.firestore().collection('privateMessages'),
    unreadMessagesRef: firebase.firestore().collection('unreadMessages'),
    channelTypingRef: firebase.firestore().collection('channelTyping'),
    privateTypingRef: firebase.firestore().collection('privateTyping'),
    location: null,
    gifQuery: '',
    selected_gif: '',
    random_gifs: [],
    search_results: [], 
    timer_duration: 0,
    error: '',
    statusRef: firebase.firestore().collection('status'),
    currentUserStatus: 'offline',
    isTyping: null,
    appState: AppState.currentState,
    selectedMessage: ''
  }

  static navigationOptions = {
    header: null
  }

  componentDidMount() {
    this.getChat();
    this.setUserLastTimeStamp();              // Method to set user's last visit to this chat window.
    this.getUserStatus();

    //Keyboard listeners 
    this.keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      this._keyboardDidShow,
    );
    this.keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      this._keyboardDidHide,
    );
    
      AppState.addEventListener('change', this._handleAppStateChanged);

      // Typing Listener
      this.getTypingStatus();
  } 

  _handleAppStateChanged = (nextAppState) => {
    if(nextAppState == 'background' || nextAppState == 'inactive') {
      this.setTypingStatus(false);
    }
  }

  getTypingStatus = () => {
    if(this.props.channel.isPrivate) {
      
          if(this.channelTypingListener) {
            this.channelTypingListener();
          }

          this.privateTypingListener = this.state.privateTypingRef.doc(this.props.auth.user.uid).onSnapshot(doc => {
            if(doc.exists) {
              this.setState({ isTyping: doc.data()[this.props.channel.currentChannel.uid] });
            }
        })
    } else {
     
      if(this.privateTypingListener) {
        this.privateTypingListener();
      }

      this.channelTypingListener = this.state.channelTypingRef.doc(this.props.channel.currentChannel.uid).onSnapshot(doc => {
        if(doc.exists) {
          if(doc.data().uid !== this.props.auth.user.uid) {
            this.setState({ isTyping: doc.data() })
          }
        }
      })
    }
  }

  _keyboardDidShow = async () => {
    this.setTypingStatus(true);
  }

  _keyboardDidHide = async () => {
    this.setTypingStatus(false);
  }

  setTypingStatus = async (status) => {
    if(this.props.channel.isPrivate) {
      try {
        await this.state.privateTypingRef.doc(this.props.channel.currentChannel.uid).set({
          [this.props.auth.user.uid] : {
            typing: status,
            uid: this.props.auth.user.uid,
            displayName: this.props.auth.user.name
          }
        })
      } catch(e) {
        console.log('Something went wrong while updating the typing status. (private)', e);
      }
    } else {
      try {
        await this.state.channelTypingRef.doc(this.props.channel.currentChannel.uid).set({
          typing: status,
          uid: this.props.auth.user.uid,
          displayName: this.props.auth.user.name
        })
      } catch(e) {
        console.log('Something went wrong while updating the typing status. (public)', e);
      }
    }
  }

  setUserLastTimeStamp = () => {
    this.state.unreadMessagesRef.doc(this.props.auth.user.uid).set({
      [this.props.channel.currentChannel.uid]: {
        last_visit: Date.now(),
        count: 0
      }
    }, { merge: true })
    .catch(e => {
      console.log('Something went wrong');
    })
  }

   // Update the end-user's unseen message count when they recieve a message for this particular thread.
   // Receives 2 parameters, value corresponds to the unseen message count of the end-user, incremented at every message they receive.
   // Reset CURRENT user's when the exit the chat window.
   // Mode corresponds to whose count to reset.

  updateEndUserCount = (value=null, mode) => {                     
    let prop = mode == 'end-user' ? this.props.auth.user.uid : this.props.channel.currentChannel.uid;
    let userDoc = mode == 'end-user' ? this.props.channel.currentChannel.uid : this.props.auth.user.uid;
    if(this.props.channel.isPrivate) {
      this.state.unreadMessagesRef.doc(userDoc).set({
        [prop]: {
          count: value ? value - 1 : firebase.firestore.FieldValue.increment(1),
        }
      }, { merge: true })
      .catch(e => {
        console.log('Something went wrong');
      })
    }
  }

  getUserStatus = () => {
    if(this.props.channel.isPrivate) {
      let uid = this.props.channel.currentChannel.uid;
     this.state.statusRef.doc(uid).get().then(snapshot => {
        this.setState({ currentUserStatus: snapshot.data().state });
      }).catch(e => {
        console.log(e)
      })
    }
  }

  //Typing Indicator Function

  // onInputTextChanged = () => {
  //   this.state.typingRef.doc(this.props.channel.currentChannel.uid).
  // }

  onBackPress = () => {
    this.props.navigation.goBack();
  }

  getChat = () => {
    const uid = this.getChannelId();
    const ref = this.props.channel.isPrivate ? this.state.privateMessagesRef : this.state.messagesRef;

    this.messageListener = ref.doc(uid).collection('chats').orderBy('createdAt','desc').onSnapshot(querySnapShot => {
      let messages = [];
      querySnapShot.forEach((query) => {
          messages.push({...query.data(), _id: query.id})
          if(query.data().duration && query.data().duration > 0 && query.data().user._id !== this.props.auth.user.uid) {
            let channelData = {
              channelId: uid,
              messageId: query.id,
              timer: query.data().duration,
              messageType: query.data().messageType,
              type: this.props.channel.isPrivate ? 'private' : 'group'
            }
            this.cloudDelete(channelData);
          }

      })
      this.setState({ messages });
    })
  }

  cloudDelete = async (channelData) => {
    try {
      await axios.post(MESSAGE_REMOVER_CLOUD_URL, channelData)
     } catch(e) {
       console.log(e);
     }
  }

  getChannelId = () => {
    if(this.props.channel.isPrivate) {
      return this.props.auth.user.uid > this.props.channel.currentChannel.uid ? 
       ( this.props.auth.user.uid + this.props.channel.currentChannel.uid ) : 
        ( this.props.channel.currentChannel.uid + this.props.auth.user.uid )  
    }

    return this.props.channel.currentChannel.uid;
  }

  createMessage = (data = null, mode) => {
    const newMessageObject = {
      createdAt: Date.now(),
      messageType: mode,
      duration: this.state.timer_duration,
      user: {
        _id: this.props.auth.user.uid,
        name: this.props.auth.user.name,
        avatar: this.props.auth.user.avatar
      }
    };

    if (mode == 'image') {
      newMessageObject.image = this.state.selected_gif;
      return newMessageObject;
    }

    if(mode == 'location') {
      newMessageObject.location = {...this.state.location};
      return newMessageObject;
    }

    if(mode == 'text') {
      newMessageObject.text = data;
      return newMessageObject;
    }

    return newMessageObject;
  }

  onSend(messages = [], mode = 'text') {
    const { privateMessagesRef, messagesRef } = this.state;
    const ref = this.props.channel.isPrivate ? privateMessagesRef : messagesRef;
    const uid = this.getChannelId();

    let newMessageObject = {};  

    newMessageObject = this.createMessage(messages[0] ? messages[0].text : null, mode);
    this.setState(previousState => ({
      messages: GiftedChat.append(previousState.messages, messages),
    }), () => {   
      ref.doc(uid).collection('chats').add(newMessageObject).then((sent) => {
        if(this.state.selected_gif) {
          this.setState({ selected_gif: '' });
        }
        if(this.state.location) {
          this.setState({ location: '' });
        }
         this.updateEndUserCount(null, 'end-user');
        if(newMessageObject.duration && newMessageObject.duration > 0) {
          let channelData = {
            channelId: uid,
            messageId: sent.id,
            timer: 'not specified',
            messageType: newMessageObject.messageType,
            type: this.props.channel.isPrivate ? 'private' : 'group'
          }
          this.cloudDelete(channelData);
        }
      }).catch(e => {
        console.log('error', e)
      })
    })
  }

  renderChatActions = () => {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'center', margin: 4}}>
        <TouchableOpacity style={{ paddingLeft: 3 }} onPress={this.toggleGifModal}>
            <MaterialIcons name="gif" color="white" size={32} />
        </TouchableOpacity>
        <TouchableOpacity style={{ paddingLeft: 3, justifyContent: 'center' }} onPress={() => this.sendLocation('location')}>
            <FontAwesome name="location-arrow" color="white" size={22} />
        </TouchableOpacity>
        <TouchableOpacity style={{ paddingLeft: 3, justifyContent: 'center' }} onPress={this.toggleTimerModal} >
            <EvilIcons name="clock" size={26} color="white"/>
        </TouchableOpacity>
      </View>
    )
  }

  getGifs = async () => {
    try { 
      let gifs = await fetch(`http://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}`);
      gifs = await gifs.json();
      gifs = gifs.data.map((gif) => {
        return {
          id: gif.id,
          preview_url: gif.images.preview_gif.url,
          full_url: gif.url
        }
      })
      this.setState({ random_gifs: gifs });
    } catch(e) {
      console.log(e);
    } 
  }

  toggleGifModal = () => {
    this.setState({ gif_modal_visible: !this.state.gif_modal_visible }, () => {
      if(this.state.gif_modal_visible) {
        // console.log('firing?')
        this.getGifs();
      }
    });
  }

  onGifQueryChange = (text) => {
    //TODO: Implement debouncing

    this.setState({ gifQuery: text }, async() => {
        try {
         
          let results = await fetch(`http://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${this.state.gifQuery}`);
          results = await results.json();
          results = results.data.map((gif) => {
            return {
              id: gif.id,
              preview_url: gif.images.preview_gif.url,
              full_url: gif.url
            }
          })
          this.setState({ search_results: results });
        } catch(e) {
          console.log(e);
        }
    })
  }

  onSelectGif = (gif_url) => {
    this.setState({ selected_gif: gif_url, gif_modal_visible: false }, () => {
      this.onSend([], 'image');
    });
  }

  toggleTimerModal = () => {
    this.setState({ timer_modal_visible: !this.state.timer_modal_visible });
  }

  onDurationSelect = (dur) => {
    this.setState({ timer_duration: dur, timer_modal_visible: false });
  }

  renderMessage = (props) => {
    return <MessageComponent {...props}/>
  }

  sendLocation = (mode) => {
    Geolocation.getCurrentPosition(info => {
      this.setState({ location: info.coords }, () => {
        this.onSend([], mode);
      });
    })
  }

  renderInputToolbar = (props) => (
    <InputToolbar {...props}
       containerStyle={{ borderRadius: 15, backgroundColor: '#3B3E46', borderTopColor: 'transparent' }} 
    />
  )

  handleAvatarPress = (props) => {
    this.props.setProfile({
      uid: props._id,
      name: props.name,
      avatar: props.avatar
    });
    this.props.navigation.navigate('Profile');
  }

  onBubbleLongPress = (props, message) => {
    if(message.messageType !== 'text') {
      return;
    }
    this.setState({ bubble_modal_visible: !this.state.bubble_modal_visible, selectedMessage: message.text });
  }

  toggleBubbleModal = () => {
    this.setState({ bubble_modal_visible: !this.state.bubble_modal_visible });
  }

  onCopyPress = () => {
    Clipboard.setString(this.state.selectedMessage);
    this.setState({ selectedMessage: '', bubble_modal_visible: false });
  }

componentWillUnmount() {
    this.updateEndUserCount(1); // 1 to bypass the coercion, reseting the current user's count to 0 when they exit this window.
    this.messageListener();
    this.setTypingStatus(false);
    if(this.privateTypingListener) {
      this.privateTypingListener();
    }
    if( this.channelTypingListener) {
      this.channelTypingListener();
    }
    // this.typingListener();
    AppState.removeEventListener('change', this._handleAppStateChanged);
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
  }

  render() {
    const {styles:redux, dimensions} = this.props.global;
    const {currentChannel} = this.props.channel;
    const { gif_modal_visible, random_gifs, search_results, gifQuery, timer_modal_visible, timer_duration, bubble_modal_visible } = this.state;
    return (
    <LinearGradient colors={redux.container.colors} style={redux.container}>
      <NavigationEvents 
        onWillFocus={payload => {
          StatusBar.setTranslucent(false)
          StatusBar.setBackgroundColor(redux.container.colors[0])
        }}
      />
      <Header
        containerStyle={{ backgroundColor: 'transparent', height: dimensions.height*0.09, borderBottomWidth: 0.3, borderBottomColor: '#363940', elevation: 1 }}
        leftComponent={ <BackButton onBackPress={this.onBackPress} /> }
        centerComponent={ 
            <Center 
              typing={this.state.isTyping}
              uri={currentChannel.iconUrl ? currentChannel.iconUrl : currentChannel.avatar} 
              name={currentChannel.name} 
              status={this.state.currentUserStatus}
              isPrivate={this.props.channel.isPrivate}
            /> 
          }
        placement="left"
        rightComponent={ <RightChatIcon /> }
      />
        <GiftedChat
            messages={this.state.messages}
            keyboardShouldPersistTaps="never"
            onSend={messages => this.onSend(messages)}
            renderActions={this.renderChatActions}
            renderMessage={this.renderMessage}
            renderInputToolbar={this.renderInputToolbar}
            textInputProps={{ style: {color: 'white', fontFamily: 'RobotoMono-Regular', flex: 1} }}
            onPressAvatar={this.handleAvatarPress}
            onLongPress={this.onBubbleLongPress}
            user={{
              _id: this.props.auth.user.uid,
              name: this.props.auth.user.name,
              avatar: this.props.auth.user.avatar
            }}
        />

        { /* GIF MODAL */ }
      <View>
        <Modal 
          animationIn="slideInUp"
          animationOut="slideOutDown"
          swipeDirection="down"
          onSwipeComplete={this.close}
          onSwipeComplete={this.toggleGifModal}
          style={{ justifyContent: 'flex-end', margin: 0,}}
          backdropOpacity={0}
          onBackdropPress={this.toggleGifModal}
          isVisible={gif_modal_visible}
          onBackButtonPress={this.toggleGifModal}
          >
            <GiphyComponent 
              search_results={search_results}
              gifs={random_gifs}
              onSelectGif={this.onSelectGif}
              gifQuery={gifQuery}
              onGifQueryChange={this.onGifQueryChange}
            />
        </Modal>
      </View>

      { /* TIMER MODAL */ }

      <View>
        <Modal 
          animationIn="slideInUp"
          animationOut="slideOutDown"
          swipeDirection="down"
          onSwipeComplete={this.close}
          onSwipeComplete={this.toggleTimerModal}
          style={{ justifyContent: 'flex-end', margin: 0,}}
          backdropOpacity={0}
          onBackdropPress={this.toggleTimerModal}
          isVisible={timer_modal_visible}
          onBackButtonPress={this.toggleTimerModal}
          >
            <TimerModal 
              timer_duration={timer_duration}
              onDurationSelect={this.onDurationSelect}
            />
        </Modal>
      </View>

      {/* CHAT BUBBLE LONG PRESS MODAL */}

      <View>
        <Modal 
          animationIn="slideInUp"
          animationOut="slideOutDown"
          swipeDirection="down"
          onSwipeComplete={this.toggleBubbleModal}
          style={{ justifyContent: 'flex-end', margin: 0,}}
          backdropOpacity={0}
          onBackdropPress={this.toggleBubbleModal}
          isVisible={bubble_modal_visible}
          onBackButtonPress={this.toggleBubbleModal}
          >
           <SelectMessage 
              onCopyPress={this.onCopyPress}
              onCancelPress={this.toggleBubbleModal}
           />
        </Modal>
      </View>

    </LinearGradient >
    )
  }
}

const mapStateToProps = state => ({
  global: state.global,
  auth: state.auth,
  channel: state.channel
})

export default withNavigation(connect(mapStateToProps, { setProfile })(ChatWindow));