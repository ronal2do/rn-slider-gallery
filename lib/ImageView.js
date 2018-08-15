// @flow

import React, {Component, type Node} from 'react';
import {
    Text,
    View,
    Image,
    Modal,
    Animated,
    FlatList,
    StyleSheet,
    Dimensions,
    PanResponder,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from 'react-native';

const IMAGE_SPEED_FOR_CLOSE = 1.1;
const SCALE_MAXIMUM = 5;
const HEADER_HEIGHT = 60;
const SCALE_EPSILON = 0.01;
const SCALE_MULTIPLIER = 1.2;
const SCALE_MAX_MULTIPLIER = 3;
const FREEZE_SCROLL_DISTANCE = 15;
const BACKGROUND_OPACITY_MULTIPLIER = 0.003;
const defaultBackgroundColor = [0, 0, 0];

function createStyles({screenWidth, screenHeight}) {
    return StyleSheet.create({
        underlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
        },
        container: {
            width: screenWidth,
            height: screenHeight,
        },
        header: {
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 100,
            height: HEADER_HEIGHT,
            width: screenWidth,
        },
        imageContainer: {
            width: screenWidth,
            height: screenHeight,
            overflow: 'hidden',
        },
        loading: {
            position: 'absolute',
            top: screenHeight / 2 - 20,
            alignSelf: 'center',
        },
        closeButton: {
            alignSelf: 'flex-end',
            height: 24,
            width: 24,
            borderRadius: 12,
            backgroundColor: 'rgba(0,0,0,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 35,
            marginRight: 15,
        },
        closeButton__text: {
            backgroundColor: 'transparent',
            fontSize: 25,
            lineHeight: 25,
            color: '#FFF',
            textAlign: 'center',
        },
        footer: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            zIndex: 100,
        },
    });
}

const getScreenDimensions = () => ({
    screenWidth: Dimensions.get('window').width,
    screenHeight: Dimensions.get('window').height,
});

let styles = createStyles(getScreenDimensions());

const generatePanHandlers = (onStart, onMove, onRelease): any =>
    PanResponder.create({
        onStartShouldSetPanResponder: (): boolean => true,
        onStartShouldSetPanResponderCapture: (): boolean => true,
        onMoveShouldSetPanResponder: (): boolean => true,
        onMoveShouldSetPanResponderCapture: (): boolean => true,
        onPanResponderGrant: onStart,
        onPanResponderMove: onMove,
        onPanResponderRelease: onRelease,
        onPanResponderTerminate: onRelease,
        onPanResponderTerminationRequest: (): void => {},
    });

const getScale = (currentDistance: number, initialDistance: number): number =>
    currentDistance / initialDistance * SCALE_MULTIPLIER;

function getDistance(touches: Array<TouchType>): number {
    const [a, b] = touches;

    if (a == null || b == null) {
        return 0;
    }

    return Math.sqrt( Math.pow((a.pageX - b.pageX), 2 )+ Math.pow(((a.pageY - b.pageY), 2)));
}

function calculateInitialScale(
    imageWidth: number = 0,
    imageHeight: number = 0,
    {screenWidth, screenHeight}
): number {
    const screenRatio = screenHeight / screenWidth;
    const imageRatio = imageHeight / imageWidth;

    if (imageWidth > screenWidth || imageHeight > screenHeight) {
        if (screenRatio > imageRatio) {
            return screenWidth / imageWidth;
        }

        return screenHeight / imageHeight;
    }

    return 1;
}

function calculateInitialTranslate(
    imageWidth: number = 0,
    imageHeight: number = 0,
    {screenWidth, screenHeight}
): TranslateType {
    const getTranslate = (axis: string): number => {
        const imageSize = axis === 'x' ? imageWidth : imageHeight;
        const screenSize = axis === 'x' ? screenWidth : screenHeight;

        if (imageWidth >= imageHeight) {
            return (screenSize - imageSize) / 2;
        }

        return screenSize / 2 - imageSize / 2;
    };

    return {
        x: getTranslate('x'),
        y: getTranslate('y'),
    };
}

function fetchImageSize(images: Array<ImageType> = []) {
    return images.reduce((acc, image, index) => {
        if (
            image.source &&
            image.source.uri &&
            (!image.width || !image.height)
        ) {
            const imageSize = new Promise((resolve, reject) => {
                Image.getSize(
                    image.source.uri,
                    (width, height) =>
                        resolve({
                            width,
                            height,
                            index,
                        }),
                    reject
                );
            });

            acc.push(imageSize);
        }

        return acc;
    }, []);
}

const shortHexRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
const fullHexRegex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

const isHex = (color: string): boolean =>
    fullHexRegex.test(color) || shortHexRegex.test(color);

function hexToRgb(hex: string): number[] {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const input = hex.replace(
        shortHexRegex,
        (m, r, g, b) => `${r}${r}${g}${g}${b}${b}`
    );

    const [match, r, g, b] = [].concat(fullHexRegex.exec(input));

    if (!match) {
        return [];
    }

    return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
}

const getInitialParams = (
    {width, height}: DimensionsType,
    screenDimensions: Object
): TransitionType => ({
    scale: calculateInitialScale(width, height, screenDimensions),
    translate: calculateInitialTranslate(width, height, screenDimensions),
});

const getImagesWithoutSize = (images: Array<ImageType>) =>
    images.filter(({width, height}) => !width || !height);

const scalesAreEqual = (scaleA: number, scaleB: number): boolean =>
    Math.abs(scaleA - scaleB) < SCALE_EPSILON;

type PropsType = {
    animationType: 'none' | 'fade' | 'slide',
    backgroundColor?: string,
    glideAlways?: boolean,
    glideAlwaysDelay?: number,
    images: Array<ImageType>,
    imageIndex: number,
    isVisible: boolean,
    onClose: () => {},
    renderFooter: ImageType => {},
};

export type StateType = {
    images: Array<ImageType>,
    isVisible: boolean,
    imageIndex: number,
    imageScale: number,
    imageTranslate: {x: number, y: number},
    scrollEnabled: boolean,
    panelsVisible: boolean,
    isFlatListRerendered: boolean,
    screenDimensions: {screenWidth: number, screenHeight: number},
};

export default class ImageView extends Component<PropsType, StateType> {
    static defaultProps = {
        backgroundColor: null,
        images: [],
        imageIndex: 0,
        glideAlways: false,
        glideAlwaysDelay: 75,
    };

    constructor(props: PropsType) {
        super(props);

        // calculate initial scale and translate for images
        const initialScreenDimensions = getScreenDimensions();
        this.imageInitialParams = props.images.map(image =>
            getInitialParams(image, initialScreenDimensions)
        );

        this.state = {
            images: props.images,
            isVisible: props.isVisible,
            imageIndex: props.imageIndex,
            imageScale: 1,
            imageTranslate: {x: 0, y: 0},
            scrollEnabled: true,
            panelsVisible: true,
            isFlatListRerendered: false,
            screenDimensions: initialScreenDimensions,
        };
        this.glideAlwaysTimer = null;
        this.listRef = null;
        this.isScrolling = false;
        this.footerHeight = 0;
        this.initialTouches = [];
        this.currentTouchesNum = 0;
        this.doubleTapTimer = null;
        this.modalAnimation = new Animated.Value(0);
        this.modalBackgroundOpacity = new Animated.Value(0);

        this.headerTranslateValue = new Animated.ValueXY();
        this.footerTranslateValue = new Animated.ValueXY();

        this.imageScaleValue = new Animated.Value(this.getInitialScale());
        this.imageTranslateValue = new Animated.ValueXY(
            this.getInitialTranslate()
        );

        this.panResponder = generatePanHandlers(
            (event: EventType): void => this.onGestureStart(event.nativeEvent),
            (event: EventType, gestureState: GestureState): void =>
                this.onGestureMove(event.nativeEvent, gestureState),
            (event: EventType, gestureState: GestureState): void =>
                this.onGestureRelease(event.nativeEvent, gestureState)
        );

        const imagesWithoutSize = getImagesWithoutSize(props.images);

        if (imagesWithoutSize.length) {
            Promise.all(fetchImageSize(imagesWithoutSize)).then(
                this.setSizeForImages
            );
        }
    }

    componentDidMount() {
        styles = createStyles(this.state.screenDimensions);
        Dimensions.addEventListener('change', this.onChangeDimension);
    }

    componentWillReceiveProps(nextProps: PropsType) {
        const {images, imageIndex, isVisible} = this.state;
        if (
            typeof nextProps.isVisible !== 'undefined' 
						|| imageIndex !== nextProps.imageIndex
        ) {
            this.onNextImagesReceived(nextProps.images, nextProps.imageIndex);

            if (
                images !== nextProps.images ||
                imageIndex !== nextProps.imageIndex
            ) {
                const imagesWithoutSize = getImagesWithoutSize(
                    nextProps.images
                );

                if (imagesWithoutSize.length) {
									Promise.all(fetchImageSize(imagesWithoutSize)).then(
										updatedImages =>
											this.onNextImagesReceived(
												this.setSizeForImages(updatedImages),
												nextProps.imageIndex
											)
									);
                }
            }

            this.setState({
                isVisible: nextProps.isVisible,
                isFlatListRerendered: false,
            });

            this.modalBackgroundOpacity.setValue(0);

            if (nextProps.isVisible) {
                Animated.timing(this.modalAnimation, {
                    duration: 400,
                    toValue: 1,
                }).start();
            }
        }
    }

    componentWillUnmount() {
        Dimensions.removeEventListener('change', this.onChangeDimension);

        if (this.glideAlwaysTimer) {
            clearTimeout(this.glideAlwaysTimer);
        }
    }

    onChangeDimension = ({window}: {window: DimensionsType}) => {
        const screenDimensions = {
            screenWidth: window.width,
            screenHeight: window.height,
        };

        this.setState({screenDimensions});
        styles = createStyles(screenDimensions);

        this.onNextImagesReceived(this.props.images, this.state.imageIndex);
    };

    onNextImagesReceived(images: Array<ImageType>, imageIndex: number = 0) {
        this.imageInitialParams = images.map(image =>
            getInitialParams(image, this.state.screenDimensions)
        );
        const {scale, translate} = this.imageInitialParams[imageIndex];

        this.setState({
            imageIndex,
            imageScale: scale,
            imageTranslate: translate,
            isFlatListRerendered: false,
        }, () => {
					const nextTick = new Promise(resolve => setTimeout(resolve, 0));
            nextTick.then(() => {
                this.listRef.scrollToIndex({
                    index: imageIndex,
                    animated: true,
                });
            });
				});

        this.imageScaleValue.setValue(scale);
        this.imageTranslateValue.setValue(translate);
    }

    // $FlowFixMe
    onFlatListRender = flatListRef => {
        const {imageIndex, isFlatListRerendered} = this.state;

        if (flatListRef && !isFlatListRerendered) {
            this.listRef = flatListRef;
            this.setState({
                isFlatListRerendered: true,
            });

            // Fix for android https://github.com/facebook/react-native/issues/13202
            const nextTick = new Promise(resolve => setTimeout(resolve, 0));
            nextTick.then(() => {
                flatListRef.scrollToIndex({
                    index: imageIndex,
                    animated: true,
                });
            });
        }
    };

    onNextImage = (event: EventType) => {
        const {imageIndex} = this.state;
        const {x} = event.nativeEvent.contentOffset || {x: 0};

        const nextImageIndex = Math.round(
            x / this.state.screenDimensions.screenWidth
        );

        this.isScrolling =
            Math.ceil(x) % this.state.screenDimensions.screenWidth > 10;

        if (imageIndex !== nextImageIndex && nextImageIndex >= 0) {
            const nextImageScale = this.getInitialScale(nextImageIndex);
            const nextImageTranslate = this.getInitialTranslate(nextImageIndex);

            this.setState({
                imageIndex: nextImageIndex,
                imageScale: nextImageScale,
                imageTranslate: nextImageTranslate,
            });

            this.imageScaleValue.setValue(nextImageScale);
            this.imageTranslateValue.setValue(nextImageTranslate);
        }
    };

    onGestureStart(event: NativeEventType) {
        this.initialTouches = event.touches;
        this.currentTouchesNum = event.touches.length;
    }

    /**
     * If image is moved from its original position
     * then disable scroll (for ScrollView)
     */
    onGestureMove(event: NativeEventType, gestureState: GestureState) {
        if (this.isScrolling) {
            return;
        }

        if (this.currentTouchesNum === 1 && event.touches.length === 2) {
            this.initialTouches = event.touches;
        }

        const {
            images,
            imageIndex,
            imageScale,
            imageTranslate,
            screenDimensions,
        } = this.state;
        const {screenHeight} = screenDimensions;
        const {touches} = event;
        const {x, y} = imageTranslate;
        const {dx, dy} = gestureState;
        const imageInitialScale = this.getInitialScale();
        const {height} = images[imageIndex];

        if (imageScale !== imageInitialScale) {
            this.imageTranslateValue.x.setValue(x + dx);
        }

        // Do not allow to move image vertically until it fits to the screen
        if (imageScale * height > screenHeight) {
            this.imageTranslateValue.y.setValue(y + dy);
        }

        // if image not scaled and fits to the screen
        if (
            scalesAreEqual(imageScale, imageInitialScale) &&
            height * imageInitialScale < screenHeight
        ) {
            const backgroundOpacity = Math.abs(
                dy * BACKGROUND_OPACITY_MULTIPLIER
            );

            this.imageTranslateValue.y.setValue(y + dy);
            this.modalBackgroundOpacity.setValue(
                backgroundOpacity > 1 ? 1 : backgroundOpacity
            );
        }

        const currentDistance = getDistance(touches);
        const initialDistance = getDistance(this.initialTouches);

        const scrollEnabled = Math.abs(dy) < FREEZE_SCROLL_DISTANCE;
        this.setState({scrollEnabled});

        if (!initialDistance) {
            return;
        }

        if (touches.length < 2) {
            return;
        }

        let nextScale = getScale(currentDistance, initialDistance) * imageScale;

        if (nextScale < imageInitialScale) {
            nextScale = imageInitialScale;
        } else if (nextScale > SCALE_MAXIMUM) {
            nextScale = SCALE_MAXIMUM;
        }

        this.imageScaleValue.setValue(nextScale);
        this.currentTouchesNum = event.touches.length;
    }

    onGestureRelease(event: NativeEventType, gestureState: GestureState) {
        if (this.glideAlwaysTimer) {
            clearTimeout(this.glideAlwaysTimer);
        }

        if (this.props.glideAlways && Platform.OS === 'android') {
            this.glideAlwaysTimer = setTimeout(() => {
                this.glideAlwaysTimer = null;
                // If standard glide is not triggered then emulate it
                // $FlowFixMe
                if (this.listRef && this.listRef.scrollToIndex) {
                    this.listRef.scrollToIndex({
                        index: this.state.imageIndex,
                        animated: true,
                    });
                }
            }, this.props.glideAlwaysDelay);
        }

        if (this.isScrolling) {
            return;
        }

        const {imageScale} = this.state;

        let {_value: scale} = this.imageScaleValue;
        const {_value: modalBackgroundOpacity} = this.modalBackgroundOpacity;

        const {dx, dy, vy} = gestureState;
        const imageInitialScale = this.getInitialScale();
        const imageInitialTranslate = this.getInitialTranslate();

        // Position haven't changed, so it just tap
        if (event && !dx && !dy && scalesAreEqual(imageScale, scale)) {
            // Double tap timer is launched, its double tap

            if (this.doubleTapTimer) {
                clearTimeout(this.doubleTapTimer);
                this.doubleTapTimer = null;

                scale = scalesAreEqual(imageInitialScale, scale)
                    ? scale * SCALE_MAX_MULTIPLIER
                    : imageInitialScale;

                Animated.timing(this.imageScaleValue, {
                    toValue: scale,
                    duration: 300,
                }).start();

                this.togglePanels(scale === imageInitialScale);
            } else {
                this.doubleTapTimer = setTimeout(() => {
                    this.togglePanels();
                    this.doubleTapTimer = null;
                }, 200);
            }
        }

        const {x, y} = this.calculateNextTranslate(dx, dy, scale);
        const scrollEnabled =
            scale === this.getInitialScale() &&
            x === imageInitialTranslate.x &&
            y === imageInitialTranslate.y;

        Animated.parallel(
            [
                modalBackgroundOpacity > 0
                    ? Animated.timing(this.modalBackgroundOpacity, {
                          toValue: 0,
                          duration: 100,
                      })
                    : null,
                Animated.timing(this.imageTranslateValue.x, {
                    toValue: x,
                    duration: 100,
                }),
                Animated.timing(this.imageTranslateValue.y, {
                    toValue: y,
                    duration: 100,
                }),
            ].filter(Boolean)
        ).start();

        // Close modal with animation if image not scaled and high vertical gesture speed
        if (
            scale === imageInitialScale &&
            Math.abs(vy) >= IMAGE_SPEED_FOR_CLOSE
        ) {
            Animated.timing(this.imageTranslateValue.y, {
                toValue: y + 400 * vy,
                duration: 150,
            }).start(() => {
                this.close();
            });
        }

        this.setState({
            imageScale: scale,
            imageTranslate: {x, y},
            scrollEnabled,
        });
    }

    onImageLoaded(index: number) {
        const {images} = this.state;

        images[index] = {...images[index], loaded: true};

        this.setState({images});
    }

    onMomentumScrollBegin = () => {
        this.isScrolling = true;
        if (this.glideAlwaysTimer) {
            // If FlatList started gliding then prevent glideAlways scrolling
            clearTimeout(this.glideAlwaysTimer);
        }
    };

    onMomentumScrollEnd = () => {
        this.isScrolling = false;
    };

    getItemLayout = (_: *, index: number): Object => {
        const {screenWidth} = this.state.screenDimensions;

        return {length: screenWidth, offset: screenWidth * index, index};
    };

    getInitialScale(index?: number): number {
        const imageIndex = index !== undefined ? index : this.state.imageIndex;

        return this.imageInitialParams[imageIndex].scale;
    }

    getInitialTranslate(index?: number): TranslateType {
        const imageIndex = index !== undefined ? index : this.state.imageIndex;

        return this.imageInitialParams[imageIndex].translate;
    }

    getImageStyle(
        image: ImageType,
        index: number
    ): {width?: number, height?: number, transform?: any, opacity?: number} {
        const {imageIndex, screenDimensions} = this.state;
        const {width, height} = image;

        if (!width || !height) {
            return {opacity: 0};
        }

        // very strange caching, fix it with changing size to 1 pixel
        const translateValue = new Animated.ValueXY(
            calculateInitialTranslate(width, height + 1, screenDimensions)
        );

        const transform =
            index === imageIndex
                ? this.imageTranslateValue.getTranslateTransform()
                : translateValue.getTranslateTransform();

        const scale =
            index === imageIndex
                ? this.imageScaleValue
                : this.getInitialScale(index);
        // $FlowFixMe
        transform.push({scale});

        return {width, height, transform};
    }

    setSizeForImages = (nextImages: Array<ImageSizeType>): Array<ImageType> => {
        if (nextImages.length === 0) {
            return [];
        }

        const {images} = this.state;

        return images.map((image, index) => {
            const nextImageSize = nextImages.find(
                nextImage => nextImage.index === index
            );

            /* eslint-disable */
            if (nextImageSize) {
                image.width = nextImageSize.width;
                image.height = nextImageSize.height;
            }
            /* eslint-enable */

            return image;
        });
    };

    imageInitialParams: TransitionType[];
    glideAlwaysTimer: ?TimeoutID;
    listRef: ?Node;
    isScrolling: boolean;
    footerHeight: number;
    initialTouches: TouchType[];
    currentTouchesNum: number;
    doubleTapTimer: ?TimeoutID;
    modalAnimation: *;
    modalBackgroundOpacity: *;
    headerTranslateValue: *;
    footerTranslateValue: *;
    imageScaleValue: *;
    imageTranslateValue: *;
    panResponder: *;

    calculateNextTranslate(
        dx: number,
        dy: number,
        scale: number
    ): {x: number, y: number} {
        const {
            images,
            imageIndex,
            imageTranslate,
            screenDimensions,
        } = this.state;
        const {x, y} = imageTranslate;
        const {screenWidth, screenHeight} = screenDimensions;
        const {width, height} = images[imageIndex];
        const imageInitialScale = this.getInitialScale();

        const getTranslate = (axis: string): number => {
            const imageSize = axis === 'x' ? width : height;
            const screenSize = axis === 'x' ? screenWidth : screenHeight;
            const leftLimit = (scale * imageSize - imageSize) / 2;
            const rightLimit = screenSize - imageSize - leftLimit;

            let nextTranslate = axis === 'x' ? x + dx : y + dy;

            // Less than the screen
            if (screenSize > scale * imageSize) {
                if (width >= height) {
                    nextTranslate = (screenSize - imageSize) / 2;
                } else {
                    nextTranslate =
                        screenSize / 2 -
                        imageSize * (scale / imageInitialScale) / 2;
                }

                return nextTranslate;
            }

            if (nextTranslate > leftLimit) {
                nextTranslate = leftLimit;
            }

            if (nextTranslate < rightLimit) {
                nextTranslate = rightLimit;
            }

            return nextTranslate;
        };

        return {x: getTranslate('x'), y: getTranslate('y')};
    }

    close() {
        this.setState({isVisible: false});

        if (typeof this.props.onClose === 'function') {
            this.props.onClose();
        }
    }

    togglePanels(isVisible?: boolean) {
        const panelsVisible =
            typeof isVisible !== 'undefined'
                ? isVisible
                : !this.state.panelsVisible;
        // toggle footer and header
        this.setState({panelsVisible});

        Animated.timing(this.headerTranslateValue.y, {
            toValue: !panelsVisible ? -HEADER_HEIGHT : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();

        if (this.footerHeight > 0) {
            Animated.timing(this.footerTranslateValue.y, {
                toValue: !panelsVisible ? this.footerHeight : 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }

		listKeyExtractor = (item: ImageType, index: number): string => item.id.toString();

    renderImage = ({item: image, index}: {item: *, index: number}): * => {
        const loaded = image.loaded && image.width && image.height;

        return (
            <View
                style={styles.imageContainer}
                onStartShouldSetResponder={(): boolean => true}
            >
                <Animated.Image
                    resizeMode="cover"
                    source={image.source}
                    style={this.getImageStyle(image, index)}
                    onLoad={(): void => this.onImageLoaded(index)}
                    {...this.panResponder.panHandlers}
                />
                {!loaded && <ActivityIndicator style={styles.loading} />}
            </View>
        );
    };

    render(): Node {
        const {animationType, renderFooter, backgroundColor} = this.props;
        const {images, imageIndex, isVisible, scrollEnabled} = this.state;

        const headerTranslate = this.headerTranslateValue.getTranslateTransform();
        const footerTranslate = this.footerTranslateValue.getTranslateTransform();
        const rgbBackgroundColor =
            backgroundColor && isHex(backgroundColor)
                ? hexToRgb(backgroundColor)
                : defaultBackgroundColor;
        const rgb = rgbBackgroundColor.join(',');
        const animatedBackgroundColor = this.modalBackgroundOpacity.interpolate(
            {
                inputRange: [0, 1],
                outputRange: [`rgba(${rgb}, 0.9)`, `rgba(${rgb}, 0.2)`],
            }
        );

        return (
            <Modal
                transparent
                visible={isVisible}
                animationType={animationType}
                onRequestClose={() => {}}
            >
                <Animated.View
                    style={[
                        {backgroundColor: animatedBackgroundColor},
                        styles.underlay,
                    ]}
                />
                <Animated.View
                    style={[styles.header, {transform: headerTranslate}]}
                >
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => {
                            this.close();
                        }}
                    >
                        <Text style={styles.closeButton__text}>×</Text>
                    </TouchableOpacity>
                </Animated.View>
                <FlatList
                    horizontal
                    pagingEnabled
                    data={images}
                    scrollEnabled={scrollEnabled}
                    scrollEventThrottle={16}
                    style={styles.container}
                    ref={this.onFlatListRender}
                    renderSeparator={() => null}
                    keyExtractor={this.listKeyExtractor}
                    onScroll={this.onNextImage}
                    renderItem={this.renderImage}
                    getItemLayout={this.getItemLayout}
                    onMomentumScrollBegin={this.onMomentumScrollBegin}
                    onMomentumScrollEnd={this.onMomentumScrollEnd}
                />
                {renderFooter && (
                    <Animated.View
                        style={[styles.footer, {transform: footerTranslate}]}
                        onLayout={event => {
                            this.footerHeight = event.nativeEvent.layout.height;
                        }}
                    >
                        {typeof renderFooter === 'function' &&
                            renderFooter(images[imageIndex])}
                    </Animated.View>
                )}
            </Modal>
        );
    }
}
