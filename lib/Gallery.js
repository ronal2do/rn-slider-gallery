/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import {Platform, StyleSheet, Text, View, TouchableOpacity, Dimensions, Image, FlatList} from 'react-native';
import ImageView from './ImageView';
const {width} = Dimensions.get('window');

type Props = {};
export default class App extends Component<Props> {

  componentDidMount() {
    this.setContentInset()
  }

  componentDidUpdate() {
    if ( this.props.imageIndex === undefined || this.props.imageIndex === null ) return
    if ( this.list === undefined ) return
     const nextTick = new Promise(resolve => setTimeout(resolve, 0));
    nextTick.then(() => {
      this.list.scrollToOffset({
        offset: ((this.props.imageIndex * 75) - this.contentInset),
      });
    });
    this.setContentInset();
  }

  setContentInset() {
    this.contentInset = (width / 2) - 37
    this.insetOffSetParams = Platform.select({
      ios: {
        contentInset: { left: this.contentInset, right: this.contentInset },
        contentOffset: { x: -this.contentInset },
        contentContainerStyle: styles.subContainer,
      },
      android: {},
    });
  }

  _keyExtractor = (item, index) => item.id.toString();

  _renderItem = ({item, index}) => (
    <TouchableOpacity
      onPress={ () => this.handleIndex(index) }
    >
      <Image
        style={{width: 75, height: 75}}
        source={item.source}
        resizeMode="cover"
      />
    </TouchableOpacity>
  )

  handleIndex = imageIndex => {
    this.props.setIndex(imageIndex)
    const nextTick = new Promise(resolve => setTimeout(resolve, 0));
    nextTick.then(() => {
      this.list.scrollToOffset({
        offset: ((imageIndex * 75) - this.contentInset),
        animated: true,
      });
    });
  }

  render() {
    const { images, isImageViewVisible, imageIndex, onClose } = this.props

    return (    
      <ImageView
        images={images}
        imageIndex={imageIndex}
        isVisible={isImageViewVisible}
        glideAlways
        onClose={onClose}
        renderFooter={() =>
          <FlatList
            ref={(list) => this.list = list}
            data={images}
            horizontal
            overScrollMode="never"
            alwaysBounceHorizontal={false}
            removeClippedSubviews={false}
            keyExtractor={this._keyExtractor}
            renderItem={this._renderItem}
          />
        }
      />
    );
  }
}

const styles = StyleSheet.create({
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5FCFF',
    paddingTop: Platform.select({ios: 0, android: 10}),
  },
  footer: {
    width,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  footerButton: {
    flexDirection: 'row',
    marginLeft: 15,
  },
  footerText: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
  },
});
