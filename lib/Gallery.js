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

export default class App extends PureComponent {
  async componentDidMount() {
    await this.setContentInset()
  }

  componentDidUpdate() {
    if (this.props.imageIndex === undefined || this.props.imageIndex === null) return
    if (this.list === undefined || this.list === null) return
    this.setContentInset()
  }

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

  keyExtractor = (item) => item.id.toString()

  renderItem = ({ item, index }) => (
    <TouchableOpacity onPress={() => this.handleIndex(index)}>
      <Image style={{ width: 75, height: 75 }} opacity={this.props.imageIndex === index ? 1 : 0.3} source={item.source} resizeMode='cover' />
    </TouchableOpacity>
  )

  renderHeader = () => (
    <TouchableOpacity style={{ padding: 20, top: 15, right: 0, position: 'absolute', zIndex: 9 }} onPress={this.props.onClose}>
      <Text style={{ color: 'white' }}>Close</Text>
    </TouchableOpacity>
  )

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

    const newImages = images.map(image => ({
      url: image.source.uri,
      ...image
    }))

    return (
      <Modal
        visible={isImageViewVisible}
        transparent={true}
        onRequestClose={onClose}
        animationType="fade"
        hardwareAccelerated={true}
      >
        <ImageViewer
          imageUrls={newImages}
          index={imageIndex}
          onSwipeDown={onClose}
          onChange={(index) => this.handleIndex(index)}
          enableSwipeDown={true}
          saveToLocalByLongPress={false}
          renderIndicator={() => null}
          pageAnimateTime={300}
          maxOverflow={600}
          flipThreshold={220}
          renderHeader={this.renderHeader}
          renderFooter={() => (
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
