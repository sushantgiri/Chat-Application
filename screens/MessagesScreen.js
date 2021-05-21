import React, {useEffect, useState,useContext}  from 'react';
import { View, Text, Button, StyleSheet, FlatList } from 'react-native';
import {
  Container,
  Card,
  UserInfo,
  UserImgWrapper,
  UserImg,
  UserInfoText,
  UserName,
  PostTime,
  MessageText,
  TextSection,
} from '../styles/MessageStyles';
import firestore from '@react-native-firebase/firestore';
import {AuthContext} from '../navigation/AuthProvider';



const Messages = [
  {
    id: '1',
    userName: 'Jenny Doe',
    userImg: require('../assets/users/user-3.jpg'),
    messageTime: '4 mins ago',
    messageText:
      'Hey there, this is my test for a post of my social app in React Native.',
  },
  {
    id: '2',
    userName: 'John Doe',
    userImg: require('../assets/users/user-1.jpg'),
    messageTime: '2 hours ago',
    messageText:
      'Hey there, this is my test for a post of my social app in React Native.',
  },
  {
    id: '3',
    userName: 'Ken William',
    userImg: require('../assets/users/user-4.jpg'),
    messageTime: '1 hours ago',
    messageText:
      'Hey there, this is my test for a post of my social app in React Native.',
  },
  {
    id: '4',
    userName: 'Selina Paul',
    userImg: require('../assets/users/user-6.jpg'),
    messageTime: '1 day ago',
    messageText:
      'Hey there, this is my test for a post of my social app in React Native.',
  },
  {
    id: '5',
    userName: 'Christy Alex',
    userImg: require('../assets/users/user-7.jpg'),
    messageTime: '2 days ago',
    messageText:
      'Hey there, this is my test for a post of my social app in React Native.',
  },
];

const MessagesScreen = ({navigation}) => {
  const {ownUser} = useContext(AuthContext);
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState(null);

  const fetchUsers = async () => {
    try {
      const list = [];

      await firestore()
        .collection('users')
        .get()
        .then((querySnapshot) => {
          // console.log('Total Posts: ', querySnapshot.size);

          querySnapshot.forEach((doc) => {
            list.push(doc.data());
          });

          

          
          
        });

      setUsers(list);

      if (loading) {
        setLoading(false);
      }

    } catch (e) {
      console.log(e);
    }
  };

  const fetchChannels = async () => {
    try {
      const list = [];

      await firestore()
        .collection('channels')
        .get()
        .then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
            list.push({ ...doc.data(), uid: doc.id })      
          });
        });

      setChannels(list);

      if (loading) {
        setLoading(false);
      }

    } catch (e) {
      console.log(e);
    }
  };

  renderUsers = ({item}) => {
    return (
      <Text>Hello</Text>
    )
  }

  renderChannels = ({item}) => {
    return (
      <Text>Hello</Text>

    )
  } 


  useEffect(() => {
    fetchUsers();
    fetchChannels();
    
  }, []);

    return (
      <Container>


        <FlatList 
          data={users}
          keyExtractor={item=>item.id}
          renderItem={({item}) => (
            <Card onPress={() => navigation.navigate('Chat', {userName: item.userName})}>
              <UserInfo>
                <UserImgWrapper>
                  <UserImg source={item.userImg} />
                </UserImgWrapper>
                <TextSection>
                  <UserInfoText>
                    <UserName>{item.email}</UserName>
                    <PostTime>{item.messageTime}</PostTime>
                  </UserInfoText>
                  <MessageText>{item.messageText}</MessageText>
                </TextSection>
              </UserInfo>
            </Card>
          )}
        />
      </Container>
    );
};

export default MessagesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center'
  },
});