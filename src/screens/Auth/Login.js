import React from 'react';
import {View, Text, StyleSheet, TextInput, Image, TouchableOpacity, KeyboardAvoidingView, ScrollView,ActivityIndicator, Dimensions} from 'react-native';
import {connect} from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import CustomTextInput from '../../components/TextInput';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import auth from '@react-native-firebase/auth';
import {setUser} from '../../redux/actions/authActions';
const ScreenHeight = Dimensions.get('window').height;

import { GoogleSignin, statusCodes } from '@react-native-community/google-signin';
import firestore from '@react-native-firebase/firestore';



class Login extends React.Component {

    state = {
        email: '',
        password: '',
        errors: [],
        secureTextEntry: true,
        loading: false
    }

    componentDidMount() {
        GoogleSignin.configure({
            webClientId:
              '403258627487-ttnr04c6o6me8ucuh4ol3vp7bkurqjrg.apps.googleusercontent.com',
          });

          return auth().onAuthStateChanged(this.onAuthStateChanged);
    }

     onAuthStateChanged = (user) => {
        if(user){
            firestore().collection('users').onSnapshot(querySnapShot => {
                let users = [];
                querySnapShot.forEach(doc => {
                    users.push(doc.data());
                })

                users = users.filter((fetchedUser) => {
                  return fetchedUser.uid === user.uid;
                })


                if(users.length == 0){
                    firestore().collection('users').add({
                        uid: user.uid,
                        name: user.displayName,
                        avatar: user.photoURL
                    })   
                }


                const userObj = {
                    name: user.displayName,
                    avatar: user.photoURL,
                    email: user.email,
                    uid: user.uid,
                }
    
                this.props.setUser(userObj);
    
                this.props.navigation.navigate('Home');
                
              })

           
           
        }
      };

    static navigationOptions = {
        header: null
    }

    handleTextInput = (key, text) => {
        this.setState({[key]: text})
    }

    handleClearInput = (key) => {
        this.setState({[key]: ''})
    }

    handleShowPassword = () => {
        this.setState((prevState) => ({
            secureTextEntry: !prevState.secureTextEntry
        }));
    }

    validation = () => {
            const { email, password, errors} = this.state;
            if(!email.length || !password.length) {
                let errors_ = [...errors];
                errors_.push('All Fields are required.');
                errors_ = [...new Set(errors_)];
                this.setState({ errors: errors_ })
                return false;
            }  
            return true;
    }

    googleSignIn = async () => {
        try {

            try {
                await GoogleSignin.revokeAccess();
                await GoogleSignin.signOut();
              } catch (error) {
                console.error(error);
              }

            const { idToken } = await GoogleSignin.signIn();

            // Create a Google credential with the token
            const googleCredential = auth.GoogleAuthProvider.credential(idToken);

            // Sign-in the user with the credential
          await  auth().signInWithCredential(googleCredential);


        } catch (error) {
            alert(error);
          if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            // user cancelled the login flow
          } else if (error.code === statusCodes.IN_PROGRESS) {
            // operation (e.g. sign in) is in progress already
          } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            // play services not available or outdated
          } else {
            // some other error happened
          }
        }
      };

    handleLogin = () => {
        const {email, password} = this.state;
        if(!this.validation()) {
            return;
        }


        this.setState({ loading: true }, () => {
            auth().signInWithEmailAndPassword(email, password).then(loggedIn => {
                
                const u = loggedIn.user._user.providerData[0]
                const userObj = {
                    name: u.displayName,
                    avatar: u.photoURL,
                    email: u.email,
                    uid: loggedIn.user._user.uid,
                }

                this.props.setUser(userObj);

            
                this.setState({ loading: false }, () => {
                    this.props.navigation.navigate('Home');
                });

            }).catch(e => {
                this.setState({ errors: this.state.errors.concat([e].toString()), loading: false })
            })
        })
    }

    render() {
        const { styles: redux, dimensions } = this.props.global;
        const { email, password, errors, loading} = this.state;
        return (
           <LinearGradient colors={redux.container.colors}  style={{ flex: 1 }}>
               <KeyboardAwareScrollView 
                    keyboardShouldPersistTaps="always"
                    enableOnAndroid 
                    enableAutomaticScroll
                    extraScrollHeight={150}
               >
               <View style={{...styles.headerContainer, marginTop: dimensions.height*0.05, alignItems: 'center'}}>
                   <Text style={styles.headerTextStyle}>
                      Sign in to begin your experience.
                   </Text> 
               </View>


               <View style={{ alignItems: 'center', marginTop: ScreenHeight*0.08 }}>
                            <TouchableOpacity 
                                activeOpacity={0.6}
                                onPress={this.googleSignIn}
                                style={{ backgroundColor: 'black', borderRadius: 8 }}
                            > 
                                <Text style={{ color: 'white', padding: 10, fontSize: 18, letterSpacing: 1.25 }}>GOOGLE LOGIN</Text>
                            </TouchableOpacity>
                        </View>
            
               <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: dimensions.height*0.05, marginBottom: dimensions.height*0.02}}>
                    <Image 
                        style={{ height: dimensions.height/8 }}
                        resizeMode="center"
                        source={require('../../../assets/superman.jpg')}
                    />
               </View>
               {<View style={{...styles.card, backgroundColor: '#FF3333', borderRadius: 2, }}>
                    {errors.map((error, index) => {
                        return (
                            <View key={index} style={{ margin: 10, justifyContent: 'center' }}>
                                <Text style={{...styles.headerTextStyle, fontSize: 15}}>
                                   {error}
                                </Text>
                            </View>
                        )
                    })}
               </View>}
               {/* AREA FOR SHOWING ERRORS */}
                <View style={styles.card}>
            
                   <CustomTextInput 
                        icon={icon => (
                            <MaterialIcons name="email" size={20} color="grey"/>
                        )}
                        placeholder="EMAIL ADDRESS"
                        clear
                        textInputStyle={{color: 'white'}}
                        //container={{ borderBottomColor: 'red' }}
                        placeholderTextColor="white"
                        onChangeText={(text) => this.handleTextInput('email', text)}
                        value={email}
                        handleClear={() => this.handleClearInput('email')}
                   />
                   <CustomTextInput 
                        icon={icon => (
                            <FontAwesome name="user-secret" size={20} color="grey"/>
                        )}
                        placeholder="PASSWORD"
                        //clear
                        textInputStyle={{color: 'white'}}
                        show
                        placeholderTextColor="white"
                        onChangeText={(text) => this.handleTextInput('password', text)}
                        value={password}
                        handleClear={() => this.handleClearInput('password')}
                        secureTextEntry={this.state.secureTextEntry}
                        handleShowPassword={this.handleShowPassword}
                   />

                           
                  
               </View>

               
               </KeyboardAwareScrollView>
               <View style={{  position: 'absolute', bottom: 0 }}>
                   <TouchableOpacity 
                        style={{...styles.buttonContainer, width: dimensions.width}}
                        onPress={this.handleLogin}
                        disabled={loading}
                   >
                        {!loading ? <Text style={styles.headerTextStyle}>
                            SIGN IN
                        </Text> : <ActivityIndicator size="small" color="green"/>}
                   </TouchableOpacity>
               </View>
           </LinearGradient>
        )
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerContainer: {
        // flex: 1,
        // backgroundColor: 'red'
    },  
    card: {
        //backgroundColor: '#b2b2b2',
        // flex: 2,
        // elevation: 0.1,
        margin: 10,
        borderRadius: 8
    },
    headerTextStyle: {
        //textAlign: 'center',
        fontSize: 15,
        color: 'white',
        fontFamily: 'RobotoMono-Regular'
    },
    buttonContainer: {
        padding: 15,
        backgroundColor: 'black',
        alignItems: 'center'
    }
})

const mapStateToProps = state => ({
    global: state.global
})

export default connect(mapStateToProps, { setUser })(Login);