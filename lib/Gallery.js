/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { PureComponent } from 'react'
import { Platform, StyleSheet, TouchableOpacity, Dimensions, Image, FlatList, Modal, Text, View } from 'react-native'
import ImageViewer from './ImageView'
const { width } = Dimensions.get('window')

const TOP_VALUE = Platform.OS === 'android' ? 0 : 20

export default class App extends PureComponent {
  state = { fullScreen: false }

  async componentDidMount() {
    await this.setContentInset()
  }

  componentDidUpdate() {
    if (this.props.imageIndex === undefined || this.props.imageIndex === null) return
    if (this.list === undefined || this.list === null) return
    this.setContentInset()
  }

  handleFullScreen = () => this.setState(prevstate => ({
    fullScreen: !prevstate.fullScreen
  }))

  async setContentInset() {
    this.contentInset = width / 2 - 37
    this.insetOffSetParams = Platform.select({
      ios: {
        contentInset: { left: this.contentInset, right: this.contentInset },
        contentOffset: { x: -this.contentInset },
        contentContainerStyle: styles.subContainer
      },
      android: {}
    })
    const nextTick = new Promise(resolve => setTimeout(resolve, 0))
    await nextTick.then(() => {
      this.list.scrollToOffset({
        offset: this.props.imageIndex * 75 - this.contentInset,
        animated: true
      })
    })
  }

  renderItem = ({ item, index }) => (
    <TouchableOpacity onPress={() => this.handleIndex(index)}>
      <Image style={{ width: 75, height: 75 }} opacity={this.props.imageIndex === index ? 1 : 0.3} source={item.source} resizeMode='cover' />
    </TouchableOpacity>
  )

  keyExtractor = (item) => item.id.toString()

  handleIndex = imageIndex => {
    if (this.props.imageIndex === imageIndex) return
    this.props.setIndex(imageIndex)
    if (this.list) {
      const nextTick = new Promise(resolve => setTimeout(resolve, 0))
      nextTick.then(() => {
        this.list.scrollToOffset({
          offset: imageIndex * 75 - this.contentInset,
          animated: true
        })
      })
    }
  }

  render() {
    const { images, isImageViewVisible, imageIndex, onClose } = this.props
    const { fullScreen } = this.state

    return (
      <Modal
        visible={isImageViewVisible}
        transparent={true}
        onRequestClose={onClose}
        animationType="fade"
        hardwareAccelerated={true}
      >
        <ImageViewer
          imageUrls={images}
          index={imageIndex}
          onSwipeDown={onClose}
          onChange={(index) => this.handleIndex(index)}
          enableSwipeDown={true}
          saveToLocalByLongPress={false}
          renderIndicator={() => null}
          pageAnimateTime={300}
          maxOverflow={600}
          flipThreshold={220}
          onClick={this.handleFullScreen}
          renderHeader={() => !fullScreen && (
            <TouchableOpacity style={{ padding: 20, top: TOP_VALUE, right: 0, position: 'absolute', zIndex: 9 }} onPress={this.props.onClose}>
              {this.props.closeComponent ? this.props.closeComponent : <Text style={{ color: 'white' }}>X</Text>}
            </TouchableOpacity>
          )}
          renderFooter={() => !fullScreen && (
            <View style={styles.footer}>
              <FlatList
                ref={list => (this.list = list)}
                data={images}
                horizontal
                overScrollMode='never'
                alwaysBounceHorizontal={false}
                removeClippedSubviews={false}
                keyExtractor={this.keyExtractor}
                renderItem={this.renderItem}
              />
            </View>
          )}
        />
      </Modal>
    )
  }
}

const styles = StyleSheet.create({
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5FCFF',
    paddingTop: Platform.select({ ios: 0, android: 10 })
  },
  footer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    width,
  },
  footerButton: {
    flexDirection: 'row',
    marginLeft: 15
  },
  footerText: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center'
  }
})
