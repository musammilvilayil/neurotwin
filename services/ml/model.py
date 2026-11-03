from tensorflow import keras
from tensorflow.keras import layers


def build_cnn_lstm(timesteps:int, channels:int, classes:int):
    inputs=keras.Input((timesteps,channels),name='eeg')
    x=layers.Conv1D(64,7,padding='same',activation='relu')(inputs)
    x=layers.BatchNormalization()(x)
    x=layers.MaxPooling1D(2)(x)
    x=layers.Conv1D(128,5,padding='same',activation='relu')(x)
    x=layers.MaxPooling1D(2)(x)
    x=layers.LSTM(64)(x)
    x=layers.Dropout(.3)(x)
    outputs=layers.Dense(classes,activation='softmax',name='probabilities')(x)
    model=keras.Model(inputs,outputs,name='neurotwin_cnn_lstm')
    model.compile(optimizer='adam',loss='sparse_categorical_crossentropy',metrics=['accuracy'])
    return model


def build_multiscale_dilated_cnn(timesteps: int = 1280, channels: int = 18, classes: int = 2):
    """Multi-Scale Dilated Temporal Convolutional Network with dual global pooling.

    Captures multi-frequency rhythmic oscillatory evolution and burst power
    while operating ~10x faster than recurrent architectures on CPU.
    """
    inputs = keras.Input((timesteps, channels), name="eeg")
    x1 = layers.Conv1D(32, 7, padding="same", activation="relu")(inputs)
    x1 = layers.BatchNormalization()(x1)
    x1 = layers.MaxPooling1D(4)(x1)

    x2 = layers.Conv1D(64, 5, dilation_rate=2, padding="same", activation="relu")(x1)
    x2 = layers.BatchNormalization()(x2)
    x2 = layers.MaxPooling1D(4)(x2)

    x3 = layers.Conv1D(128, 3, dilation_rate=4, padding="same", activation="relu")(x2)
    x3 = layers.BatchNormalization()(x3)
    x3 = layers.MaxPooling1D(4)(x3)

    avg_pool = layers.GlobalAveragePooling1D()(x3)
    max_pool = layers.GlobalMaxPooling1D()(x3)
    merged = layers.Concatenate()([avg_pool, max_pool])

    d = layers.Dense(64, activation="relu")(merged)
    d = layers.Dropout(0.4)(d)
    d = layers.Dense(32, activation="relu")(d)
    d = layers.Dropout(0.2)(d)
    outputs = layers.Dense(classes, activation="softmax", name="probabilities")(d)
    model = keras.Model(inputs, outputs, name="neurotwin_multiscale_dilated_cnn")
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    return model

