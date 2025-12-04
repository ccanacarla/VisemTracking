import pandas as pd
import os
import glob
import argparse

class TrajectoryProcessor:
    """
    Processa arquivos de texto de rastreamento de trajetória de um único usuário.
    """

    def __init__(self, user_data_path):
        """
        Inicializa o processador.

        Args:
            user_data_path (str): O caminho para a pasta que contém os arquivos .txt do usuário.
        """
        if not os.path.isdir(user_data_path):
            raise FileNotFoundError(f"O diretório especificado não foi encontrado: {user_data_path}")
        
        self.user_data_path = user_data_path
        self.user_id = os.path.basename(os.path.normpath(user_data_path))

    def process_files(self):
        """
        Lê e processa todos os arquivos .txt, retornando um único DataFrame.

        Returns:
            pandas.DataFrame: Um DataFrame contendo todos os dados dos frames,
                              ou um DataFrame vazio se nenhum arquivo for processado.
        """
        file_pattern = os.path.join(self.user_data_path, '*.txt')
        txt_files = sorted(glob.glob(file_pattern))

        if not txt_files:
            print(f"AVISO: Nenhum arquivo .txt foi encontrado em '{self.user_data_path}'.")
            return pd.DataFrame()

        print(f"Encontrados {len(txt_files)} arquivos .txt para o usuário '{self.user_id}'.")
        
        all_frames_data = []

        for file_path in txt_files:
            try:
                frame_number_str = os.path.basename(file_path).split('.')[0].split('_')[-1]
                
                # IMPORTANTE: Ajuste os nomes das colunas conforme necessário.
                df_frame = pd.read_csv(
                    file_path,
                    sep='\\s+',
                    header=None,
                    names=['sperm_id', 'x', 'y', 'param_extra_1', 'param_extra_2']
                )

                df_frame['frame'] = int(frame_number_str)
                all_frames_data.append(df_frame)

            except ValueError:
                print(f"Aviso: Não foi possível extrair o número do frame do arquivo '{os.path.basename(file_path)}'. Pulando.")
            except Exception as e:
                print(f"Erro ao processar o arquivo {file_path}: {e}")

        if not all_frames_data:
            print("Nenhum dado foi processado com sucesso.")
            return pd.DataFrame()

        full_df = pd.concat(all_frames_data, ignore_index=True)
        full_df['user_id'] = self.user_id
        
        # Reorganiza as colunas
        id_cols = ['user_id', 'frame', 'sperm_id']
        data_cols = [col for col in full_df.columns if col not in id_cols]
        full_df = full_df[id_cols + data_cols]
        
        return full_df

    def save_to_csv(self, dataframe, output_path=None):
        """
        Salva o DataFrame em um arquivo CSV.

        Args:
            dataframe (pandas.DataFrame): O DataFrame a ser salvo.
            output_path (str, optional): O caminho do arquivo de saída. 
                                         Se não for fornecido, um nome de arquivo padrão será gerado.
        """
        if dataframe.empty:
            print("O DataFrame está vazio. Nada para salvar.")
            return

        if output_path is None:
            output_path = f'trajetorias_{self.user_id}.csv'
        
        dataframe.to_csv(output_path, index=False)
        print(f"\nDataFrame salvo com sucesso em: '{os.path.abspath(output_path)}'")


def main():
    """
    Função principal para executar o processamento de trajetória a partir da linha de comando.
    """
    parser = argparse.ArgumentParser(
        description="Processador de Trajetória de Espermatozoides. Converte arquivos .txt de um usuário em um único arquivo CSV.",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "data_path", 
        help="O caminho para a pasta que contém os arquivos .txt de um usuário."
    )
    parser.add_argument(
        "-o", "--output",
        dest="output_path",
        help="(Opcional) O caminho completo para o arquivo CSV de saída.\nSe não for fornecido, será salvo no diretório atual.",
        default=None
    )

    args = parser.parse_args()

    try:
        print("--- Iniciando processamento ---")
        processor = TrajectoryProcessor(args.data_path)
        processed_data = processor.process_files()
        processor.save_to_csv(processed_data, args.output_path)
        print("--- Processamento concluído ---")
    except FileNotFoundError as e:
        print(f"ERRO: {e}")
    except Exception as e:
        print(f"Ocorreu um erro inesperado: {e}")


if __name__ == "__main__":
    main()
