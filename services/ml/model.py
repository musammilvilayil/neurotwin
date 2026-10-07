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
